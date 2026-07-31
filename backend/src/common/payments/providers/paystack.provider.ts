import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ContributionProvider } from '../../enums';
import {
  InitiatePaymentParams,
  InitiatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
} from '../payment-provider.interface';

interface PaystackInitializeResponse {
  status: boolean;
  message?: string;
  data?: { authorization_url: string; reference: string };
}

interface PaystackVerifyResponse {
  status: boolean;
  message?: string;
  data?: { status: string; amount: number; id: number; reference: string };
}

// Direct REST calls against Paystack's API (no third-party SDK) — this keeps the
// signature-verification logic, the piece that actually protects real money, fully
// auditable in our own code instead of trusting an unaudited dependency for it.
@Injectable()
export class PaystackProvider implements PaymentProvider {
  readonly name = ContributionProvider.PAYSTACK;
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly configService: ConfigService) {}

  private get secretKey(): string {
    const key = this.configService.get<string>('paystackSecretKey');
    if (!key) {
      throw new BadGatewayException('Paystack is not configured on this server.');
    }
    return key;
  }

  async initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const body = (await response.json()) as PaystackInitializeResponse;
    if (!response.ok || !body.status || !body.data) {
      this.logger.error(`Paystack initialize failed: ${JSON.stringify(body)}`);
      throw new BadGatewayException(body.message ?? 'Paystack could not start this payment.');
    }

    return {
      checkoutUrl: body.data.authorization_url,
      providerReference: body.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifyPaymentResult> {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const body = (await response.json()) as PaystackVerifyResponse;
    if (!response.ok || !body.status || !body.data) {
      this.logger.error(`Paystack verify failed for ${reference}: ${JSON.stringify(body)}`);
      throw new BadGatewayException(body.message ?? 'Paystack could not verify this payment.');
    }

    const status: VerifyPaymentResult['status'] =
      body.data.status === 'success' ? 'SUCCESSFUL' : body.data.status === 'failed' ? 'FAILED' : 'PENDING';

    return {
      status,
      amountKobo: body.data.amount,
      providerReference: String(body.data.id),
      raw: body as unknown as Record<string, unknown>,
    };
  }

  // Paystack signs the raw request body with HMAC-SHA512 using the secret key; the
  // x-paystack-signature header must match a fresh computation over the exact bytes
  // received, byte for byte — this is why the webhook route needs the raw body, not
  // the JSON-parsed one.
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;

    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  extractReferenceFromWebhook(rawBody: Buffer): string | null {
    try {
      const payload = JSON.parse(rawBody.toString('utf8')) as { data?: { reference?: string } };
      return payload.data?.reference ?? null;
    } catch {
      return null;
    }
  }
}
