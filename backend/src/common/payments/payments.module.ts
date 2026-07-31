import { Module } from '@nestjs/common';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentProviderRegistry } from './payment-provider.registry';

@Module({
  providers: [PaystackProvider, PaymentProviderRegistry],
  exports: [PaymentProviderRegistry],
})
export class PaymentsModule {}
