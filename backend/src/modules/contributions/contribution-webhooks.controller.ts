import { Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { ContributionsService } from './contributions.service';
import { ContributionProvider } from '../../common/enums';

// Deliberately its own controller with no guards at all — Paystack (and later
// Flutterwave/Stripe) call these directly with no JWT, so this must never sit behind
// JwtAuthGuard/RolesGuard. Every route here is instead protected by verifying the
// gateway's own signature over the raw request body (see ContributionsService.
// handleWebhook() and each PaymentProvider's verifyWebhookSignature()). Excluded from
// Swagger since it's not part of the authenticated API surface a human calls.
@ApiExcludeController()
@Controller('contributions/webhooks')
export class ContributionWebhooksController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async paystack(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') signature?: string) {
    await this.contributionsService.handleWebhook(ContributionProvider.PAYSTACK, req.rawBody ?? Buffer.alloc(0), signature);
    return { received: true };
  }
}
