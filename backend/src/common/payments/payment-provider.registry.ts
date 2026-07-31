import { BadRequestException, Injectable } from '@nestjs/common';
import { ContributionProvider } from '../enums';
import { PaymentProvider } from './payment-provider.interface';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { StripeProvider } from './providers/stripe.provider';

// One place that knows which gateways are actually wired up.
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<ContributionProvider, PaymentProvider>();

  constructor(
    paystackProvider: PaystackProvider,
    flutterwaveProvider: FlutterwaveProvider,
    stripeProvider: StripeProvider,
  ) {
    this.providers.set(ContributionProvider.PAYSTACK, paystackProvider);
    this.providers.set(ContributionProvider.FLUTTERWAVE, flutterwaveProvider);
    this.providers.set(ContributionProvider.STRIPE, stripeProvider);
  }

  get(provider: ContributionProvider): PaymentProvider {
    const found = this.providers.get(provider);
    if (!found) {
      throw new BadRequestException(`${provider} is not available yet.`);
    }
    return found;
  }
}
