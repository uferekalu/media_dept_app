import { BadRequestException, Injectable } from '@nestjs/common';
import { ContributionProvider } from '../enums';
import { PaymentProvider } from './payment-provider.interface';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';

// One place that knows which gateways are actually wired up. A later, eligibility-gated
// PR for Stripe just registers its own provider here — nothing else in the
// Contributions module changes.
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<ContributionProvider, PaymentProvider>();

  constructor(paystackProvider: PaystackProvider, flutterwaveProvider: FlutterwaveProvider) {
    this.providers.set(ContributionProvider.PAYSTACK, paystackProvider);
    this.providers.set(ContributionProvider.FLUTTERWAVE, flutterwaveProvider);
  }

  get(provider: ContributionProvider): PaymentProvider {
    const found = this.providers.get(provider);
    if (!found) {
      throw new BadRequestException(`${provider} is not available yet.`);
    }
    return found;
  }
}
