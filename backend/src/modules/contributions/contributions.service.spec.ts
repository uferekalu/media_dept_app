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

    it('rejects a webhook with an invalid signature before touching anything else', async () => {
      paystackProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'bad-signature'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(webhookEventModel.create).not.toHaveBeenCalled();
    });

    it('processes a validly-signed webhook exactly once, deduping a retried delivery', async () => {
      paystackProvider.verifyWebhookSignature.mockReturnValue(true);
      paystackProvider.extractReferenceFromWebhook.mockReturnValue('mdc_abc');
      webhookEventModel.create.mockResolvedValue({});
      contributionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'contribution-id',
          status: ContributionStatus.SUCCESSFUL,
          internal_reference: 'mdc_abc',
        }),
      });

      await service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'sig-1');

      expect(webhookEventModel.create).toHaveBeenCalled();

      // Retry: the same signature hashes to the same event_id, so the unique index
      // rejects the second insert — simulate that duplicate-key error.
      const duplicateError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      webhookEventModel.create.mockRejectedValueOnce(duplicateError);

      await service.handleWebhook(ContributionProvider.PAYSTACK, rawBody, 'sig-1');

      // findOne (the lookup inside verifyAndSync) should only have been reached once,
      // on the first delivery — the retry short-circuits before ever calling it again.
      expect(contributionModel.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
