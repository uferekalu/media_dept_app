import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ContributionProvider } from '../../../common/enums';

export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

// Dedup ledger, not a domain entity — purely a technical safeguard so a gateway's
// retried webhook delivery can never double-apply a status change. event_id is a hash
// of the request's own signature header: since the signature is a deterministic
// HMAC/hash of the body, an identical retried delivery produces an identical
// signature, making it a reliable, provider-agnostic idempotency key without needing
// each gateway's own event-id format.
@Schema({ timestamps: { createdAt: 'processed_at', updatedAt: false } })
export class WebhookEvent {
  @Prop({ required: true, enum: ContributionProvider })
  provider: ContributionProvider;

  @Prop({ required: true })
  event_id: string;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
WebhookEventSchema.index({ provider: 1, event_id: 1 }, { unique: true });
