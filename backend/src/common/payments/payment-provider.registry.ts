import { BadRequestException, Injectable } from '@nestjs/common';
import { ContributionProvider } from '../enums';
import { PaymentProvider } from './payment-provider.interface';
import { PaystackProvider } from './providers/paystack.provider';

// One place that knows which gateways are actually wired up. PR-032 (Flutterwave) and
// a later, eligibility-gated PR (Stripe) each just register their own provider here —
// nothing else in the Contributions module changes.
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<ContributionProvider, PaymentProvider>();

  constructor(paystackProvider: PaystackProvider) {
    this.providers.set(ContributionProvider.PAYSTACK, paystackProvider);
  }

  get(provider: ContributionProvider): PaymentProvider {
    const found = this.providers.get(provider);
    if (!found) {
      throw new BadRequestException(`${provider} is not available yet.`);
    }
    return found;
  }
}
