import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';
import { Contribution, ContributionDocument } from './schemas/contribution.schema';
import { WebhookEvent, WebhookEventDocument } from './schemas/webhook-event.schema';
import { InitiateContributionDto } from './dto/initiate-contribution.dto';
import { ContributionCampaignsService } from '../contribution-campaigns/contribution-campaigns.service';
import { PaymentProviderRegistry } from '../../common/payments/payment-provider.registry';
import { ContributionCampaignStatus, ContributionProvider, ContributionStatus } from '../../common/enums';

@Injectable()
export class ContributionsService {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(
    @InjectModel(Contribution.name) private contributionModel: Model<ContributionDocument>,
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEventDocument>,
    private readonly contributionCampaignsService: ContributionCampaignsService,
    private readonly paymentProviderRegistry: PaymentProviderRegistry,
    private readonly configService: ConfigService,
  ) {}

  // Creates the ledger row first (so we have a reference to hand the gateway), then
  // calls the gateway. If the gateway call itself fails, the row is marked FAILED with
  // the error recorded rather than left dangling as a phantom PENDING contribution.
  async initiate(dto: InitiateContributionDto, contributorId: string): Promise<ContributionDocument> {
    const campaign = await this.contributionCampaignsService.findOne(dto.campaign);
    if (campaign.status !== ContributionCampaignStatus.ACTIVE) {
      throw new BadRequestException(
        `This campaign is ${campaign.status} and is not accepting contributions.`,
      );
    }

    const provider = this.paymentProviderRegistry.get(dto.provider);
    const internalReference = `mdc_${randomUUID()}`;

    const contribution = await this.contributionModel.create({
      campaign: dto.campaign,
      contributor: contributorId,
      amount: dto.amount,
      currency: 'NGN',
      provider: dto.provider,
      internal_reference: internalReference,
      status: ContributionStatus.PENDING,
      notes: dto.notes,
    });

    try {
      const frontendUrl = this.configService.get<string>('frontendUrl');
      const result = await provider.initiate({
        reference: internalReference,
        amountKobo: dto.amount,
        email: dto.email,
        // `contribution` (the Mongo _id) rides alongside `ref` (internal_reference) so
        // the frontend return page can call GET/POST /contributions/:id directly —
        // those routes are keyed by _id, not internal_reference, and there's no
        // by-reference lookup endpoint. Keeping both means the return page works even
        // if the contributor comes back on a different device/browser (no reliance on
        // anything stashed client-side before the redirect).
        callbackUrl: `${frontendUrl}/campaigns/${dto.campaign}/contribute/return?ref=${internalReference}&contribution=${contribution._id}`,
        metadata: { campaignId: dto.campaign, contributorId },
      });

      contribution.checkout_url = result.checkoutUrl;
      if (result.providerReference) contribution.provider_reference = result.providerReference;
      await contribution.save();
    } catch (error) {
      contribution.status = ContributionStatus.FAILED;
      contribution.raw_provider_payload = {
        error: error instanceof Error ? error.message : String(error),
      };
      await contribution.save();
      throw error;
    }

    return contribution;
  }

  findAll(filters: {
    campaign?: string;
    status?: ContributionStatus;
    provider?: ContributionProvider;
  }): Promise<ContributionDocument[]> {
    const query: Record<string, string> = {};
    if (filters.campaign) query.campaign = filters.campaign;
    if (filters.status) query.status = filters.status;
    if (filters.provider) query.provider = filters.provider;
    return this.contributionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ContributionDocument> {
    const contribution = await this.contributionModel.findById(id).exec();
    if (!contribution) {
      throw new NotFoundException(`Contribution ${id} not found`);
    }
    return contribution;
  }

  private findByReference(reference: string): Promise<ContributionDocument | null> {
    return this.contributionModel.findOne({ internal_reference: reference }).exec();
  }

  // The core of the whole payment flow: re-fetches the authoritative status/amount
  // from the gateway itself, never trusting the caller (webhook body or otherwise).
  // Safe to call repeatedly/concurrently — see the atomic findOneAndUpdate below.
  async verifyAndSync(reference: string): Promise<ContributionDocument> {
    const contribution = await this.findByReference(reference);
    if (!contribution) {
      throw new NotFoundException(`No contribution found for reference ${reference}`);
    }

    if (contribution.status !== ContributionStatus.PENDING) {
      return contribution;
    }

    const provider = this.paymentProviderRegistry.get(contribution.provider);
    const result = await provider.verify(reference, contribution.provider_reference);

    if (result.status === 'SUCCESSFUL' && result.amountKobo !== contribution.amount) {
      // Never trust an amount mismatch as a real payment — this is exactly the class
      // of tampering/bug this system must catch, not silently accept.
      this.logger.error(
        `Amount mismatch for ${reference}: expected ${contribution.amount}, gateway reports ${result.amountKobo}`,
      );
      const failed = await this.contributionModel
        .findOneAndUpdate(
          { _id: contribution._id, status: ContributionStatus.PENDING },
          { $set: { status: ContributionStatus.FAILED, raw_provider_payload: result.raw } },
          { new: true },
        )
        .exec();
      return failed ?? (await this.findOne(String(contribution._id)));
    }

    if (result.status === 'SUCCESSFUL') {
      // Atomic, conditional transition: only the caller whose update actually matches
      // {status: PENDING} proceeds to credit the campaign — protects against
      // double-counting if the webhook and a manual poll land at nearly the same time.
      const updated = await this.contributionModel
        .findOneAndUpdate(
          { _id: contribution._id, status: ContributionStatus.PENDING },
          {
            $set: {
              status: ContributionStatus.SUCCESSFUL,
              paid_at: new Date(),
              provider_reference: result.providerReference,
              raw_provider_payload: result.raw,
            },
          },
          { new: true },
        )
        .exec();

      if (updated) {
        await this.contributionCampaignsService.incrementRaised(updated.campaign.toString(), updated.amount);
        return updated;
      }
      return this.findOne(String(contribution._id));
    }

    if (result.status === 'FAILED') {
      const updated = await this.contributionModel
        .findOneAndUpdate(
          { _id: contribution._id, status: ContributionStatus.PENDING },
          { $set: { status: ContributionStatus.FAILED, raw_provider_payload: result.raw } },
          { new: true },
        )
        .exec();
      return updated ?? (await this.findOne(String(contribution._id)));
    }

    // Still PENDING at the gateway — just refresh the audit trail.
    contribution.raw_provider_payload = result.raw;
    await contribution.save();
    return contribution;
  }

  // Entry point for every gateway's webhook route. Verifies the signature, delegates
  // the actual status update to verifyAndSync() (itself idempotent — see its own
  // atomic findOneAndUpdate calls), and only *after* that succeeds records the
  // delivery in WebhookEvent so a later genuine retry short-circuits without a second
  // round-trip to the gateway. Recording the dedup row before the sync completes would
  // mean a transient failure (e.g. a network blip calling the gateway's verify API)
  // permanently "burns" that delivery's dedup slot — the gateway's own retry of the
  // exact same event would then be wrongly dropped as a duplicate of an attempt that
  // never actually succeeded.
  async handleWebhook(
    providerName: ContributionProvider,
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<void> {
    const provider = this.paymentProviderRegistry.get(providerName);

    if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) {
      this.logger.warn(`Rejected a ${providerName} webhook with an invalid signature`);
      throw new BadRequestException('Invalid webhook signature.');
    }

    const reference = provider.extractReferenceFromWebhook(rawBody);
    if (!reference) {
      this.logger.warn(`${providerName} webhook had no extractable reference — nothing to sync`);
      return;
    }

    await this.verifyAndSync(reference);

    // event_id is a hash of the raw BODY, not the signature header — see
    // WebhookEvent's own schema comment for why a header-based key breaks for both
    // Flutterwave (static shared-secret header, identical on every delivery) and
    // Stripe (timestamp-salted header, different on every delivery including retries
    // of the same event).
    const eventId = createHash('sha256').update(rawBody).digest('hex');
    try {
      await this.webhookEventModel.create({
        provider: providerName,
        event_id: eventId,
        payload: JSON.parse(rawBody.toString('utf8')),
      });
    } catch (error) {
      // A duplicate key here just means this exact delivery was already recorded by
      // an earlier, successful call (a genuine retry after success, or a race against
      // a concurrent identical delivery) — verifyAndSync() above already made that
      // safe to run twice, so there's nothing left to do.
      if (!this.isDuplicateKeyError(error)) {
        throw error;
      }
      this.logger.log(`${providerName} webhook delivery already recorded — no-op`);
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
  }
}
