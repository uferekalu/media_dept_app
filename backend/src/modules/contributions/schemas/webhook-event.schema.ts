import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ContributionProvider } from '../../../common/enums';

export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

// Dedup ledger, not a domain entity — purely a technical safeguard so a gateway's
// retried webhook delivery can never double-apply a status change. event_id is a hash
// of the raw request BODY, not the signature header — the header varies per gateway
// in ways that break a header-based key: Flutterwave's `verif-hash` is a static
// shared secret, identical on every single delivery regardless of the underlying
// event, so hashing it would collide every Flutterwave webhook onto the same dedup
// slot after the first one ever received; Stripe's `stripe-signature` embeds a fresh
// timestamp per send, so hashing it would never recognize a genuine Stripe retry as a
// duplicate. The raw body itself doesn't have either problem: a true retried delivery
// resends the same event payload byte-for-byte (that's what "retry" means), so hashing
// the body is deterministic across a real retry for all three gateways, while still
// varying per distinct event since no two different transactions share a body. See
// ContributionsService.handleWebhook().
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
