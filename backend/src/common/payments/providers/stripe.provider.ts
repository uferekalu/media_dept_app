import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// This project's tsconfig doesn't set esModuleInterop, only allowSyntheticDefaultImports
// (a type-checker-only flag) — a plain `import Stripe from 'stripe'` type-checks fine
// but compiles to `stripe_1.default`, which doesn't exist at runtime since the package
// exports the constructor directly (`module.exports = Stripe`), not an ES default.
// The `= require(...)` form always compiles to a plain `require()` with no interop
// wrapping assumed, matching the package's actual CJS shape exactly.
import Stripe = require('stripe');
import { ContributionProvider } from '../../enums';
import {
  InitiatePaymentParams,
  InitiatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
} from '../payment-provider.interface';

// Uses the official `stripe` npm package — unlike Paystack/Flutterwave, Stripe's own
// SDK is the right call here: its `webhooks.constructEvent()` is the documented,
// correct primitive for signature verification, and there's no REST-call complexity
// worth hand-rolling for a gateway that's a much smaller slice of this app's traffic
// (NGN cards via Nigeria-based rails, per the brief's Phase 10 eligibility note).
//
// Unlike Flutterwave, Stripe's `unit_amount` for NGN (a standard 2-decimal currency,
// not a zero-decimal one like JPY) is already in kobo — the same unit
// Contribution.amount uses everywhere in this app. No conversion needed here.
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly name = ContributionProvider.STRIPE;
  private readonly logger = new Logger(StripeProvider.name);
  private stripeClient?: Stripe;

  constructor(private readonly configService: ConfigService) {}

  private get client(): Stripe {
    if (!this.stripeClient) {
      const key = this.configService.get<string>('stripeSecretKey');
      if (!key) {
        throw new BadGatewayException('Stripe is not configured on this server.');
      }
      this.stripeClient = new Stripe(key);
    }
    return this.stripeClient;
  }

  private get webhookSecret(): string {
    const secret = this.configService.get<string>('stripeWebhookSecret');
    if (!secret) {
      throw new BadGatewayException('Stripe webhook secret is not configured on this server.');
    }
    return secret;
  }

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    try {
      const session = await this.client.checkout.sessions.create({
        mode: 'payment',
        // client_reference_id is Stripe's own built-in field for exactly this —
        // attaching our internal_reference so we can look the session back up by it.
        client_reference_id: params.reference,
        customer_email: params.email,
        metadata: params.metadata as Record<string, string> | undefined,
        line_items: [
          {
            price_data: {
              currency: 'ngn',
              product_data: { name: 'Contribution' },
              unit_amount: params.amountKobo,
            },
            quantity: 1,
          },
        ],
        success_url: params.callbackUrl,
        cancel_url: params.callbackUrl,
      });

      if (!session.url) {
        throw new BadGatewayException('Stripe did not return a checkout URL.');
      }

      return { checkoutUrl: session.url, providerReference: session.id };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error(`Stripe checkout session creation failed: ${error instanceof Error ? error.message : error}`);
      throw new BadGatewayException(error instanceof Error ? error.message : 'Stripe could not start this payment.');
    }
  }

  // Checkout Sessions have no "look up by client_reference_id" API (Stripe's Search
  // API doesn't cover this resource) — confirmed at compile time (the `search` method
  // doesn't exist on the SDK's Sessions resource type at all), not just at runtime.
  // The only reliable lookup is a direct retrieve by the session's own id, which is
  // exactly what providerReference (Contribution.provider_reference, set right after
  // initiate() succeeds) is for.
  async verify(reference: string, providerReference?: string): Promise<VerifyPaymentResult> {
    if (!providerReference) {
      throw new BadGatewayException(
        `No Stripe session id on record for ${reference} — cannot verify without it.`,
      );
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await this.client.checkout.sessions.retrieve(providerReference);
    } catch (error) {
      this.logger.error(
        `Stripe session retrieve failed for ${reference} (${providerReference}): ${error instanceof Error ? error.message : error}`,
      );
      throw new BadGatewayException('Stripe could not verify this payment.');
    }

    const status: VerifyPaymentResult['status'] =
      session.payment_status === 'paid' ? 'SUCCESSFUL' : session.status === 'expired' ? 'FAILED' : 'PENDING';

    return {
      status,
      amountKobo: session.amount_total ?? 0,
      providerReference: session.id,
      raw: session as unknown as Record<string, unknown>,
    };
  }

  // stripe.webhooks.constructEvent() both verifies the signature and parses the event
  // in one step, throwing on any mismatch — the documented, correct primitive for this
  // gateway. It's cheap (a local HMAC computation, no network call), so calling it here
  // and again in extractReferenceFromWebhook is negligible overhead for the clean
  // separation the PaymentProvider interface expects.
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    try {
      this.client.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  extractReferenceFromWebhook(rawBody: Buffer): string | null {
    try {
      const payload = JSON.parse(rawBody.toString('utf8')) as {
        data?: { object?: { client_reference_id?: string } };
      };
      return payload.data?.object?.client_reference_id ?? null;
    } catch {
      return null;
    }
  }
}
