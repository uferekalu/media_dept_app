import { ContributionProvider } from '../enums';

export interface InitiatePaymentParams {
  // Our own server-generated reference (Contribution.internal_reference) — always
  // generated before calling the gateway, never derived from anything the gateway
  // returns.
  reference: string;
  amountKobo: number;
  email: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  checkoutUrl: string;
  providerReference?: string;
}

export interface VerifyPaymentResult {
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  amountKobo: number;
  providerReference: string;
  // The full verify-API response body, kept for Contribution.raw_provider_payload.
  raw: Record<string, unknown>;
}

// Every gateway integration implements this. Two invariants every implementation must
// hold (see backend/CLAUDE.md's Contributions section):
// 1. verify() always re-fetches the authoritative status/amount from the gateway's own
//    API — it never trusts a value handed to it by the caller.
// 2. verifyWebhookSignature() must reject (return false) on any missing/mismatched
//    signature, never fail open.
export interface PaymentProvider {
  readonly name: ContributionProvider;
  initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verify(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean;
  // Reads just enough of the (already signature-verified) webhook body to know which
  // Contribution it's about — ContributionsService.verifyAndSync() does the actual
  // status update via verify(), never by trusting fields inside the webhook body
  // itself.
  extractReferenceFromWebhook(rawBody: Buffer): string | null;
}
