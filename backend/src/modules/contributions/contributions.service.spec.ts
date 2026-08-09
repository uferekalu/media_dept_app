import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { Contribution } from './schemas/contribution.schema';
import { WebhookEvent } from './schemas/webhook-event.schema';
import { ContributionCampaignsService } from '../contribution-campaigns/contribution-campaigns.service';
import { PaymentProviderRegistry } from '../../common/payments/payment-provider.registry';
import { ContributionCampaignStatus, ContributionProvider, ContributionStatus } from '../../common/enums';

describe('ContributionsService', () => {
  let service: ContributionsService;
  let campaignsService: { findOne: jest.Mock; incrementRaised: jest.Mock };
  let providerRegistry: { get: jest.Mock };
  let paystackProvider: {
    initiate: jest.Mock;
    verify: jest.Mock;
    verifyWebhookSignature: jest.Mock;
    extractReferenceFromWebhook: jest.Mock;
  };
  let contributionModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let webhookEventModel: { create: jest.Mock };

  beforeEach(async () => {
    contributionModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    webhookEventModel = { create: jest.fn() };
    campaignsService = {
      findOne: jest.fn().mockResolvedValue({ _id: 'campaign-id', status: ContributionCampaignStatus.ACTIVE }),
      incrementRaised: jest.fn().mockResolvedValue(undefined),
    };
    paystackProvider = {
      initiate: jest.fn(),
      verify: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      extractReferenceFromWebhook: jest.fn(),
    };
    providerRegistry = { get: jest.fn().mockReturnValue(paystackProvider) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionsService,
        { provide: getModelToken(Contribution.name), useValue: contributionModel },
        { provide: getModelToken(WebhookEvent.name), useValue: webhookEventModel },
        { provide: ContributionCampaignsService, useValue: campaignsService },
        { provide: PaymentProviderRegistry, useValue: providerRegistry },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3100') } },
      ],
    }).compile();

    service = moduleRef.get(ContributionsService);
  });

  describe('initiate', () => {
    const dto = {
      campaign: 'campaign-id',
      amount: 5000000,
      provider: ContributionProvider.PAYSTACK,
      email: 'giver@example.com',
    };

    it('rejects a contribution to a campaign that is not ACTIVE', async () => {
      campaignsService.findOne.mockResolvedValue({ _id: 'campaign-id', status: ContributionCampaignStatus.CLOSED });

      await expect(service.initiate(dto, 'member-id')).rejects.toBeInstanceOf(BadRequestException);
      expect(contributionModel.create).not.toHaveBeenCalled();
    });

    it('creates a PENDING row, calls the provider, and stores the checkout_url', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      contributionModel.create.mockResolvedValue({ save, campaign: 'campaign-id', amount: dto.amount });
      paystackProvider.initiate.mockResolvedValue({ checkoutUrl: 'https://paystack.test/checkout', providerReference: 'ref-1' });

      const result = await service.initiate(dto, 'member-id');

      expect(contributionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign: 'campaign-id',
          contributor: 'member-id',
          amount: 5000000,
          provider: ContributionProvider.PAYSTACK,
          status: ContributionStatus.PENDING,
        }),
      );
      expect(paystackProvider.initiate).toHaveBeenCalled();
      expect(result.checkout_url).toBe('https://paystack.test/checkout');
      expect(save).toHaveBeenCalled();
    });

    it('marks the contribution FAILED (not left dangling PENDING) if the gateway call throws', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const contribution = { save, status: ContributionStatus.PENDING };
      contributionModel.create.mockResolvedValue(contribution);
      paystackProvider.initiate.mockRejectedValue(new Error('network error'));

      await expect(service.initiate(dto, 'member-id')).rejects.toThrow('network error');

      expect(contribution.status).toBe(ContributionStatus.FAILED);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('verifyAndSync', () => {
    function mockExistingContribution(overrides: Record<string, unknown> = {}) {
      const contribution = {
        _id: 'contribution-id',
        internal_reference: 'mdc_abc',
        status: ContributionStatus.PENDING,
        amount: 5000000,
        provider: ContributionProvider.PAYSTACK,
        campaign: { toString: () => 'campaign-id' },
        save: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
      contributionModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(contribution) });
      return contribution;
    }

    it('throws NotFoundException when no contribution matches the reference', async () => {
      contributionModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.verifyAndSync('mdc_missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is a no-op for a contribution that is already resolved (safe to call repeatedly)', async () => {
      mockExistingContribution({ status: ContributionStatus.SUCCESSFUL });

      const result = await service.verifyAndSync('mdc_abc');

      expect(result.status).toBe(ContributionStatus.SUCCESSFUL);
      expect(paystackProvider.verify).not.toHaveBeenCalled();
    });

    it('marks SUCCESSFUL and credits the campaign when the gateway confirms the exact amount', async () => {
      mockExistingContribution();
      paystackProvider.verify.mockResolvedValue({
        status: 'SUCCESSFUL',
        amountKobo: 5000000,
        providerReference: '999',
        raw: { ok: true },
      });
      const updatedDoc = {
        campaign: { toString: () => 'campaign-id' },
        amount: 5000000,
        status: ContributionStatus.SUCCESSFUL,
      };
      contributionModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedDoc) });

      const result = await service.verifyAndSync('mdc_abc');

      expect(contributionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'contribution-id', status: ContributionStatus.PENDING },
        expect.objectContaining({ $set: expect.objectContaining({ status: ContributionStatus.SUCCESSFUL }) }),
        { new: true },
      );
      expect(campaignsService.incrementRaised).toHaveBeenCalledWith('campaign-id', 5000000);
      expect(result.status).toBe(ContributionStatus.SUCCESSFUL);
    });

    it('never credits the campaign twice when the atomic update loses the race (already applied elsewhere)', async () => {
      mockExistingContribution();
      paystackProvider.verify.mockResolvedValue({
        status: 'SUCCESSFUL',
        amountKobo: 5000000,
        providerReference: '999',
        raw: { ok: true },
      });
      // Another concurrent call already flipped it to SUCCESSFUL — our conditional
      // findOneAndUpdate filter no longer matches, so it returns null.
      contributionModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      contributionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: ContributionStatus.SUCCESSFUL }),
      });

      await service.verifyAndSync('mdc_abc');

      expect(campaignsService.incrementRaised).not.toHaveBeenCalled();
    });

    it('marks FAILED and never credits the campaign on an amount mismatch, even if the gateway says success', async () => {
      mockExistingContribution({ amount: 5000000 });
      paystackProvider.verify.mockResolvedValue({
        status: 'SUCCESSFUL',
        amountKobo: 1000000, // tampered/mismatched — far less than expected
        providerReference: '999',
        raw: { suspicious: true },
      });
      contributionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: ContributionStatus.FAILED }),
      });

      const result = await service.verifyAndSync('mdc_abc');

      expect(result.status).toBe(ContributionStatus.FAILED);
      expect(campaignsService.incrementRaised).not.toHaveBeenCalled();
    });

    it('marks FAILED when the gateway reports the payment failed', async () => {
      mockExistingContribution();
      paystackProvider.verify.mockResolvedValue({ status: 'FAILED', amountKobo: 5000000, providerReference: '999', raw: {} });
      contributionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ status: ContributionStatus.FAILED }),
      });

      const result = await service.verifyAndSync('mdc_abc');

      expect(result.status).toBe(ContributionStatus.FAILED);
    });

    it('leaves a still-PENDING gateway transaction alone', async () => {
      const contribution = mockExistingContribution();
      paystackProvider.verify.mockResolvedValue({ status: 'PENDING', amountKobo: 5000000, providerReference: '999', raw: {} });

      const result = await service.verifyAndSync('mdc_abc');

      expect(result.status).toBe(ContributionStatus.PENDING);
      expect(contribution.save).toHaveBeenCalled();
      expect(campaignsService.incrementRaised).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'mdc_abc' } }));

    function mockAlreadyResolvedContribution() {
      contributionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'contribution-id',
          status: ContributionStatus.SUCCESSFUL,
          internal_reference: 'mdc_abc',
        }),
      });
    }

    it('rejects a webhook with an invalid signature before touching anything else', async () => {
      paystackProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'bad-signature'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(webhookEventModel.create).not.toHaveBeenCalled();
    });

    it('runs verifyAndSync on every delivery (cheap no-op once resolved) and dedupes only the WebhookEvent record', async () => {
      paystackProvider.verifyWebhookSignature.mockReturnValue(true);
      paystackProvider.extractReferenceFromWebhook.mockReturnValue('mdc_abc');
      webhookEventModel.create.mockResolvedValue({});
      mockAlreadyResolvedContribution();

      await service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'sig-1');
      expect(webhookEventModel.create).toHaveBeenCalledTimes(1);
      expect(contributionModel.findOne).toHaveBeenCalledTimes(1);

      // Retry of the exact same delivery: same rawBody, so the same event_id hash —
      // the unique index rejects the second WebhookEvent insert, but verifyAndSync
      // still runs (harmlessly, since the contribution is already resolved).
      const duplicateError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      webhookEventModel.create.mockRejectedValueOnce(duplicateError);

      await service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'sig-1');
      expect(webhookEventModel.create).toHaveBeenCalledTimes(2);
      expect(contributionModel.findOne).toHaveBeenCalledTimes(2);
    });

    it('does not record the webhook event if verifyAndSync throws, so a genuine gateway retry of the same failed delivery is never wrongly deduped', async () => {
      paystackProvider.verifyWebhookSignature.mockReturnValue(true);
      paystackProvider.extractReferenceFromWebhook.mockReturnValue('mdc_abc');
      contributionModel.findOne.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB down')) });

      await expect(service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'sig-1')).rejects.toThrow(
        'DB down',
      );

      expect(webhookEventModel.create).not.toHaveBeenCalled();
    });

    it('two different Flutterwave deliveries are never wrongly deduped, even though every Flutterwave webhook carries the exact same signature header', async () => {
      // Flutterwave's "signature" is a static, dashboard-configured shared secret —
      // identical on literally every delivery, unlike Paystack's per-body HMAC or
      // Stripe's per-send timestamped signature. If event_id were still derived from
      // the signature header (the pre-fix bug), these two calls would collide on the
      // same dedup key despite being two completely unrelated contributions.
      const flutterwaveProvider = {
        verifyWebhookSignature: jest.fn().mockReturnValue(true),
        extractReferenceFromWebhook: jest.fn(),
      };
      providerRegistry.get.mockReturnValue(flutterwaveProvider);
      webhookEventModel.create.mockResolvedValue({});

      const bodyA = Buffer.from(JSON.stringify({ data: { tx_ref: 'mdc_aaa' } }));
      const bodyB = Buffer.from(JSON.stringify({ data: { tx_ref: 'mdc_bbb' } }));
      const sameStaticSecretHeader = 'the-same-configured-webhook-hash';

      flutterwaveProvider.extractReferenceFromWebhook.mockReturnValueOnce('mdc_aaa');
      contributionModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ _id: 'a', status: ContributionStatus.SUCCESSFUL, internal_reference: 'mdc_aaa' }),
      });
      await service.handleWebhook(ContributionProvider.FLUTTERWAVE, bodyA, sameStaticSecretHeader);

      flutterwaveProvider.extractReferenceFromWebhook.mockReturnValueOnce('mdc_bbb');
      contributionModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ _id: 'b', status: ContributionStatus.SUCCESSFUL, internal_reference: 'mdc_bbb' }),
      });
      await service.handleWebhook(ContributionProvider.FLUTTERWAVE, bodyB, sameStaticSecretHeader);

      // Both deliveries got their own WebhookEvent row — neither was dropped as a
      // false "duplicate" of the other.
      expect(webhookEventModel.create).toHaveBeenCalledTimes(2);
      expect(contributionModel.findOne).toHaveBeenCalledTimes(2);
    });
  });
});
