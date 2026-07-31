import { Module } from '@nestjs/common';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { PaymentProviderRegistry } from './payment-provider.registry';

@Module({
  providers: [PaystackProvider, FlutterwaveProvider, PaymentProviderRegistry],
  exports: [PaymentProviderRegistry],
})
export class PaymentsModule {}
