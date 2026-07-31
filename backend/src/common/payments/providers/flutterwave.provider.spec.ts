import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { FlutterwaveProvider } from './flutterwave.provider';

describe('FlutterwaveProvider', () => {
  let provider: FlutterwaveProvider;
  const SECRET_KEY = 'FLWSECK_TEST-secret';
  const WEBHOOK_HASH = 'my-configured-webhook-hash';

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FlutterwaveProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'flutterwaveSecretKey' ? SECRET_KEY : key === 'flutterwaveWebhookHash' ? WEBHOOK_HASH : undefined,
            ),
          },
        },
      ],
    }).compile();

    provider = moduleRef.get(FlutterwaveProvider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initiate', () => {
    it('converts our internal kobo amount to Naira before calling Flutterwave', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: { link: 'https://checkout.flutterwave.com/xyz' } }),
      } as Response);

      const result = await provider.initiate({
        reference: 'mdc_abc',
        amountKobo: 5000000,
        email: 'giver@example.com',
        callbackUrl: 'https://app.test/return',
      });

      expect(result.checkoutUrl).toBe('https://checkout.flutterwave.com/xyz');
      const [, init] = fetchSpy.mock.calls[0];
      const body = JSON.parse(init!.body as string);
      expect(body.amount).toBe(50000); // 5,000,000 kobo -> ₦50,000
      expect(body.currency).toBe('NGN');
      expect(body.tx_ref).toBe('mdc_abc');
    });

    it('throws BadGatewayException when Flutterwave responds with an error', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ status: 'error', message: 'Invalid amount' }),
      } as Response);

      await expect(
        provider.initiate({ reference: 'mdc_abc', amountKobo: 5000000, email: 'x@example.com', callbackUrl: 'https://app.test' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('verify', () => {
    it('converts the Naira amount back to kobo, rounding away float noise', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { id: 12345, tx_ref: 'mdc_abc', amount: 1.1, currency: 'NGN', status: 'successful' },
        }),
      } as Response);

      const result = await provider.verify('mdc_abc');

      // 1.1 * 100 is 110.00000000000001 in raw JS float math — must come out exact.
      expect(result.amountKobo).toBe(110);
      expect(result.status).toBe('SUCCESSFUL');
      expect(result.providerReference).toBe('12345');
    });

    it('maps a failed transaction to FAILED', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { id: 1, tx_ref: 'mdc_abc', amount: 500, currency: 'NGN', status: 'failed' },
        }),
      } as Response);

      const result = await provider.verify('mdc_abc');
      expect(result.status).toBe('FAILED');
    });

    it('reports PENDING (not an error) when Flutterwave has no record yet for a just-initiated reference', async () => {
      // Confirmed against the real API: a transaction the contributor hasn't opened
      // the checkout page for yet comes back as HTTP 400, status: "error", data: null.
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ status: 'error', message: 'No transaction was found for this id', data: null }),
      } as Response);

      const result = await provider.verify('mdc_fresh');

      expect(result.status).toBe('PENDING');
    });

    it('still throws BadGatewayException for a genuine error (e.g. bad secret key, 401)', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ status: 'error', message: 'Invalid authorization key', data: null }),
      } as Response);

      await expect(provider.verify('mdc_abc')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts the exact configured webhook hash', () => {
      expect(provider.verifyWebhookSignature(Buffer.from('{}'), WEBHOOK_HASH)).toBe(true);
    });

    it('rejects any other value, including a near-miss', () => {
      expect(provider.verifyWebhookSignature(Buffer.from('{}'), 'my-configured-webhook-has')).toBe(false);
      expect(provider.verifyWebhookSignature(Buffer.from('{}'), 'totally-wrong')).toBe(false);
    });

    it('rejects when no header is present', () => {
      expect(provider.verifyWebhookSignature(Buffer.from('{}'), undefined)).toBe(false);
    });
  });

  describe('extractReferenceFromWebhook', () => {
    it('reads tx_ref out of a valid payload', () => {
      const rawBody = Buffer.from(JSON.stringify({ data: { tx_ref: 'mdc_xyz' } }));
      expect(provider.extractReferenceFromWebhook(rawBody)).toBe('mdc_xyz');
    });

    it('returns null for malformed JSON instead of throwing', () => {
      expect(provider.extractReferenceFromWebhook(Buffer.from('not json'))).toBeNull();
    });
  });
});
