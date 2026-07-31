import { Module } from '@nestjs/common';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentProviderRegistry } from './payment-provider.registry';

@Module({
  providers: [PaystackProvider, FlutterwaveProvider, StripeProvider, PaymentProviderRegistry],
  exports: [PaymentProviderRegistry],
})
export class PaymentsModule {}
