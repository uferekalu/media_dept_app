import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { StripeProvider } from './stripe.provider';

// jest.mock's factory is hoisted above imports/const declarations, so the mock fns it
// returns can't be plain outer-scope `const`s (they'd hit a TDZ error at hoist time) —
// they're created inside the factory instead and attached to the mock constructor
// itself so the tests below can grab them via jest.requireMock(). The mock's shape
// must match the real package's exactly: `require('stripe')` returns the constructor
// directly (module.exports = Stripe), not a `{ default: ... }` wrapper — StripeProvider
// imports it via `= require('stripe')` for exactly this reason (see its own comment).
jest.mock('stripe', () => {
  const mockCheckoutSessionsCreate = jest.fn();
  const mockCheckoutSessionsRetrieve = jest.fn();
  const mockConstructEvent = jest.fn();
  const MockStripe: unknown = jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutSessionsCreate, retrieve: mockCheckoutSessionsRetrieve } },
    webhooks: { constructEvent: mockConstructEvent },
  }));
  Object.assign(MockStripe as object, { mockCheckoutSessionsCreate, mockCheckoutSessionsRetrieve, mockConstructEvent });
  return MockStripe;
});

const stripeMock = jest.requireMock('stripe') as unknown as {
  mockCheckoutSessionsCreate: jest.Mock;
  mockCheckoutSessionsRetrieve: jest.Mock;
  mockConstructEvent: jest.Mock;
};

describe('StripeProvider', () => {
  let provider: StripeProvider;
  const mockCheckoutSessionsCreate = stripeMock.mockCheckoutSessionsCreate;
  const mockCheckoutSessionsRetrieve = stripeMock.mockCheckoutSessionsRetrieve;
  const mockConstructEvent = stripeMock.mockConstructEvent;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StripeProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'stripeSecretKey' ? 'sk_test_x' : key === 'stripeWebhookSecret' ? 'whsec_x' : undefined,
            ),
          },
        },
      ],
    }).compile();

    provider = moduleRef.get(StripeProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiate', () => {
    it('creates a Checkout Session with client_reference_id and the amount already in kobo (no conversion)', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' });

      const result = await provider.initiate({
        reference: 'mdc_abc',
        amountKobo: 5000000,
        email: 'giver@example.com',
        callbackUrl: 'https://app.test/return',
      });

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(result.providerReference).toBe('cs_test_123');
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          client_reference_id: 'mdc_abc',
          customer_email: 'giver@example.com',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({ currency: 'ngn', unit_amount: 5000000 }),
            }),
          ],
        }),
      );
    });

    it('throws BadGatewayException when Stripe rejects the request', async () => {
      mockCheckoutSessionsCreate.mockRejectedValue(new Error('Invalid API key'));

      await expect(
        provider.initiate({ reference: 'mdc_abc', amountKobo: 5000000, email: 'x@example.com', callbackUrl: 'https://app.test' }),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('verify', () => {
    it('retrieves the session directly by its stored Stripe id, not by our own reference', async () => {
      mockCheckoutSessionsRetrieve.mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'paid',
        status: 'complete',
        amount_total: 5000000,
      });

      const result = await provider.verify('mdc_abc', 'cs_test_123');

      expect(result.status).toBe('SUCCESSFUL');
      expect(result.amountKobo).toBe(5000000);
      expect(result.providerReference).toBe('cs_test_123');
      expect(mockCheckoutSessionsRetrieve).toHaveBeenCalledWith('cs_test_123');
    });

    it('maps an expired session to FAILED', async () => {
      mockCheckoutSessionsRetrieve.mockResolvedValue({
        id: 'cs_test_123',
        payment_status: 'unpaid',
        status: 'expired',
        amount_total: 5000000,
      });

      const result = await provider.verify('mdc_abc', 'cs_test_123');
      expect(result.status).toBe('FAILED');
    });

    it('throws when no provider_reference is on record to look the session up by', async () => {
      await expect(provider.verify('mdc_fresh', undefined)).rejects.toBeInstanceOf(BadGatewayException);
      expect(mockCheckoutSessionsRetrieve).not.toHaveBeenCalled();
    });

    it('throws BadGatewayException when the Stripe retrieve call itself fails', async () => {
      mockCheckoutSessionsRetrieve.mockRejectedValue(new Error('No such checkout session'));

      await expect(provider.verify('mdc_abc', 'cs_test_bad')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts when stripe.webhooks.constructEvent succeeds', () => {
      mockConstructEvent.mockReturnValue({ type: 'checkout.session.completed' });

      expect(provider.verifyWebhookSignature(Buffer.from('{}'), 'valid-sig')).toBe(true);
    });

    it('rejects when stripe.webhooks.constructEvent throws (bad/forged signature)', () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature');
      });

      expect(provider.verifyWebhookSignature(Buffer.from('{}'), 'forged-sig')).toBe(false);
    });

    it('rejects when no signature header is present', () => {
      expect(provider.verifyWebhookSignature(Buffer.from('{}'), undefined)).toBe(false);
    });
  });

  describe('extractReferenceFromWebhook', () => {
    it('reads client_reference_id out of a checkout.session.completed payload', () => {
      const rawBody = Buffer.from(JSON.stringify({ data: { object: { client_reference_id: 'mdc_xyz' } } }));
      expect(provider.extractReferenceFromWebhook(rawBody)).toBe('mdc_xyz');
    });

    it('returns null for malformed JSON instead of throwing', () => {
      expect(provider.extractReferenceFromWebhook(Buffer.from('not json'))).toBeNull();
    });
  });
});
