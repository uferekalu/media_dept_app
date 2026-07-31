import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { ContributionProvider } from '../../enums';
import {
  InitiatePaymentParams,
  InitiatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
} from '../payment-provider.interface';

interface FlutterwavePaymentResponse {
  status: string;
  message?: string;
  data?: { link: string };
}

interface FlutterwaveVerifyResponse {
  status: string;
  message?: string;
  data?: { id: number; tx_ref: string; amount: number; currency: string; status: string };
}

// Direct REST calls against Flutterwave's v3 API (no third-party SDK), same reasoning
// as PaystackProvider: the signature/hash check that actually protects real money
// stays fully auditable in our own code.
//
// One gotcha this adapter exists specifically to hide: Flutterwave's `amount` is in
// the MAJOR currency unit (Naira), not kobo — the opposite of Paystack. Every
// Contribution.amount in this app is always kobo (brief Section 2), so this provider
// converts at its own boundary (kobo/100 out, naira*100 back in) so nothing outside
// this file ever has to think about which gateway uses which unit.
@Injectable()
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = ContributionProvider.FLUTTERWAVE;
  private readonly logger = new Logger(FlutterwaveProvider.name);
  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  constructor(private readonly configService: ConfigService) {}

  private get secretKey(): string {
    const key = this.configService.get<string>('flutterwaveSecretKey');
    if (!key) {
      throw new BadGatewayException('Flutterwave is not configured on this server.');
    }
    return key;
  }

  private get webhookHash(): string {
    const hash = this.configService.get<string>('flutterwaveWebhookHash');
    if (!hash) {
      throw new BadGatewayException('Flutterwave webhook hash is not configured on this server.');
    }
    return hash;
  }

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const response = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amountKobo / 100,
        currency: 'NGN',
        redirect_url: params.callbackUrl,
        customer: { email: params.email },
        meta: params.metadata,
      }),
    });

    const body = (await response.json()) as FlutterwavePaymentResponse;
    if (!response.ok || body.status !== 'success' || !body.data) {
      this.logger.error(`Flutterwave initialize failed: ${JSON.stringify(body)}`);
      throw new BadGatewayException(body.message ?? 'Flutterwave could not start this payment.');
    }

    return { checkoutUrl: body.data.link };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const response = await fetch(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const body = (await response.json()) as FlutterwaveVerifyResponse;

    // Confirmed live: unlike Paystack (which reports a fresh, untouched transaction as
    // "abandoned"), Flutterwave has no record at all to verify_by_reference until the
    // contributor actually opens the checkout page — it answers with HTTP 400 and no
    // `data`. That's a normal, expected state for a just-initiated contribution, not a
    // real failure, so it's reported as PENDING here rather than thrown. A genuine
    // problem (bad secret key, Flutterwave outage) comes back as a different status
    // (401/5xx) and still throws below.
    if (response.status === 400 && body.status !== 'success') {
      this.logger.warn(`Flutterwave has no transaction yet for ${reference}: ${JSON.stringify(body)}`);
      return { status: 'PENDING', amountKobo: 0, providerReference: '', raw: body as unknown as Record<string, unknown> };
    }

    if (!response.ok || body.status !== 'success' || !body.data) {
      this.logger.error(`Flutterwave verify failed for ${reference}: ${JSON.stringify(body)}`);
      throw new BadGatewayException(body.message ?? 'Flutterwave could not verify this payment.');
    }

    const status: VerifyPaymentResult['status'] =
      body.data.status === 'successful' ? 'SUCCESSFUL' : body.data.status === 'failed' ? 'FAILED' : 'PENDING';

    return {
      status,
      // Math.round guards against float noise from the naira-to-kobo conversion
      // (e.g. 1.1 * 100 === 110.00000000000001 in JS) — this must be an exact integer
      // to compare against Contribution.amount.
      amountKobo: Math.round(body.data.amount * 100),
      providerReference: String(body.data.id),
      raw: body as unknown as Record<string, unknown>,
    };
  }

  // Flutterwave's webhook verification is a plain shared-secret string comparison (the
  // "verif-hash" header) — not an HMAC over the body like Paystack. Still a
  // timing-safe comparison to avoid leaking the secret via response-time side channel.
  verifyWebhookSignature(_rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;

    const expectedBuffer = Buffer.from(this.webhookHash, 'utf8');
    const receivedBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  extractReferenceFromWebhook(rawBody: Buffer): string | null {
    try {
      const payload = JSON.parse(rawBody.toString('utf8')) as { data?: { tx_ref?: string } };
      return payload.data?.tx_ref ?? null;
    } catch {
      return null;
    }
  }
}
