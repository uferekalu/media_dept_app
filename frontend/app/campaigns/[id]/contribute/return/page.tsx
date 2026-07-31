'use client';

import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useGetContributionQuery, useVerifyContributionMutation } from '@/lib/redux/api';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { buttonVariants } from '@/components/ui/button';
import { cn, formatNaira } from '@/lib/utils';
import { ContributionStatus } from '@/lib/types/enums';

const POLL_INTERVAL_MS = 3000;

// Return page after a Paystack/Flutterwave/Stripe checkout redirect (brief Section 4I:
// "a Contribution's status is only ever changed by a verified webhook ... never by the
// browser's return redirect alone"). This page never trusts the redirect itself — it
// polls GET /contributions/:id (refreshed by our own POST /:id/verify safety-net call
// on mount, in case the webhook hasn't landed yet) until the gateway-confirmed status
// settles.
export default function ContributionReturnPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const contributionId = searchParams.get('contribution');

  const [verify] = useVerifyContributionMutation();
  const verifyAttempted = useRef(false);

  const {
    data: contribution,
    isLoading,
    isError,
  } = useGetContributionQuery(contributionId ?? '', {
    skip: !contributionId,
    pollingInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!contributionId || verifyAttempted.current) return;
    verifyAttempted.current = true;
    verify({ id: contributionId, campaignId }).catch(() => {
      // Best-effort — the poll above will keep checking regardless, and the webhook is
      // still the real source of truth landing independently of this call.
    });
  }, [contributionId, campaignId, verify]);

  if (!contributionId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">We couldn&apos;t confirm this automatically</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            This return link is missing its contribution reference. If you completed a payment, check the
            campaign&apos;s progress below — it updates as soon as the gateway confirms it, even without this page.
          </p>
          <Link href={`/campaigns/${campaignId}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-1')}>
            Back to campaign
          </Link>
        </EmptyPanel>
      </main>
    );
  }

  const status = contribution?.status;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {(isLoading || !contribution || status === ContributionStatus.PENDING) && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Loader2 className="size-7 animate-spin" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Confirming your contribution…</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            We&apos;re checking with the payment provider. This usually only takes a few seconds — no need to
            refresh.
          </p>
        </EmptyPanel>
      )}

      {isError && !isLoading && !contribution && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this contribution</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Check the campaign&apos;s progress directly — it updates as soon as the gateway confirms your payment.
          </p>
          <Link href={`/campaigns/${campaignId}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-1')}>
            Back to campaign
          </Link>
        </EmptyPanel>
      )}

      {contribution && status === ContributionStatus.SUCCESSFUL && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <CheckCircle2 className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Thank you!</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Your contribution of {formatNaira(contribution.amount)} was received.
          </p>
          <Link href={`/campaigns/${campaignId}`} className={cn(buttonVariants({ variant: 'default' }), 'mt-1')}>
            Back to campaign
          </Link>
        </EmptyPanel>
      )}

      {contribution && (status === ContributionStatus.FAILED || status === ContributionStatus.REFUNDED) && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <XCircle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">
            {status === ContributionStatus.REFUNDED ? 'This contribution was refunded' : 'This payment didn\'t go through'}
          </p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {status === ContributionStatus.REFUNDED
              ? 'The gateway reports this contribution has been refunded.'
              : 'No money was taken, or it has been returned. Feel free to try again.'}
          </p>
          <Link href={`/campaigns/${campaignId}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-1')}>
            Back to campaign
          </Link>
        </EmptyPanel>
      )}
    </main>
  );
}
