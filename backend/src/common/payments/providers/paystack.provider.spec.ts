import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaystackProvider } from './paystack.provider';

describe('PaystackProvider', () => {
  let provider: PaystackProvider;
  const SECRET = 'sk_test_secret';

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PaystackProvider,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(SECRET) } },
      ],
    }).compile();

    provider = moduleRef.get(PaystackProvider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a signature that correctly HMACs the raw body with the secret key', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } }));
      const validSignature = createHmac('sha512', SECRET).update(rawBody).digest('hex');

      expect(provider.verifyWebhookSignature(rawBody, validSignature)).toBe(true);
    });

    it('rejects a signature computed with the wrong secret (forged/tampered request)', () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } }));
      const forgedSignature = createHmac('sha512', 'not-the-real-secret').update(rawBody).digest('hex');

      expect(provider.verifyWebhookSignature(rawBody, forgedSignature)).toBe(false);
    });

    it('rejects a valid signature paired with a body that was altered afterward', () => {
      const originalBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } }));
      const signature = createHmac('sha512', SECRET).update(originalBody).digest('hex');
      const tamperedBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-2' } }));

      expect(provider.verifyWebhookSignature(tamperedBody, signature)).toBe(false);
    });

    it('rejects when no signature header is present at all', () => {
      const rawBody = Buffer.from('{}');
      expect(provider.verifyWebhookSignature(rawBody, undefined)).toBe(false);
    });
  });

  describe('extractReferenceFromWebhook', () => {
    it('reads the reference out of a valid payload', () => {
      const rawBody = Buffer.from(JSON.stringify({ data: { reference: 'mdc_abc123' } }));
      expect(provider.extractReferenceFromWebhook(rawBody)).toBe('mdc_abc123');
    });

    it('returns null for malformed JSON instead of throwing', () => {
      expect(provider.extractReferenceFromWebhook(Buffer.from('not json'))).toBeNull();
    });

    it('returns null when there is no reference field', () => {
      expect(provider.extractReferenceFromWebhook(Buffer.from('{}'))).toBeNull();
    });
  });

  describe('verify', () => {
    it('maps a successful Paystack transaction to SUCCESSFUL with the gateway amount', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: true, data: { status: 'success', amount: 15000000, id: 999, reference: 'mdc_abc123' } }),
      } as Response);

      const result = await provider.verify('mdc_abc123');

      expect(result.status).toBe('SUCCESSFUL');
      expect(result.amountKobo).toBe(15000000);
      expect(result.providerReference).toBe('999');
    });

    it('throws BadGatewayException when Paystack responds with an error', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        json: async () => ({ status: false, message: 'Transaction reference not found' }),
      } as Response);

      await expect(provider.verify('bad-ref')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});
