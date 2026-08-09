'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useGetContributionQuery, useVerifyContributionMutation } from '@/lib/redux/api';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { buttonVariants } from '@/components/ui/button';
import { cn, formatNaira } from '@/lib/utils';
import { ContributionStatus } from '@/lib/types/enums';

const POLL_INTERVAL_MS = 3000;
// A checkout the contributor abandoned (closed the gateway's page, hit its own
// "cancel" link, or just walked away) never becomes SUCCESSFUL/FAILED — it just sits
// PENDING until the gateway's own checkout session eventually expires, which for some
// gateways is measured in hours. Rather than trap the contributor in an endless
// spinner, offer a way out after a short wait; polling keeps running underneath in
// case the payment actually does resolve a moment later.
const STUCK_AFTER_MS = 20_000;

// Return page after a Paystack/Flutterwave/Stripe checkout redirect (brief Section 4I:
// "a Contribution's status is only ever changed by a verified webhook ... never by the
// browser's return redirect alone"). This page never trusts the redirect itself — it
// polls GET /contributions/:id (refreshed by our own POST /:id/verify safety-net call
// on mount, in case the webhook hasn't landed yet) until the gateway-confirmed status
// settles. Polling itself stops once that happens — see the conditional
// pollingInterval below.
export default function ContributionReturnPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const contributionId = searchParams.get('contribution');

  const [verify] = useVerifyContributionMutation();
  const verifyAttempted = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  // Tracks the last status this component reacted to, purely so the block below can
  // tell "did the query's result just change" and update pollingEnabled exactly once
  // per real change — the React-documented way to adjust state in response to a
  // prop/query-result change without the extra render pass an effect would cost
  // (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [lastSeenStatus, setLastSeenStatus] = useState<ContributionStatus | undefined>(undefined);

  const {
    data: contribution,
    isLoading,
    isError,
    error,
  } = useGetContributionQuery(contributionId ?? '', {
    skip: !contributionId,
    // Only keep polling while still unresolved — a contributor who leaves this tab
    // open after a SUCCESSFUL/FAILED/REFUNDED result shouldn't generate a request
    // every 3 seconds forever.
    pollingInterval: pollingEnabled ? POLL_INTERVAL_MS : 0,
  });

  if (contribution?.status !== lastSeenStatus) {
    setLastSeenStatus(contribution?.status);
    if (contribution && contribution.status !== ContributionStatus.PENDING) {
      setPollingEnabled(false);
    }
  }

  useEffect(() => {
    if (!contributionId || verifyAttempted.current) return;
    verifyAttempted.current = true;
    verify({ id: contributionId, campaignId }).catch(() => {
      // Best-effort — the poll above will keep checking regardless, and the webhook is
      // still the real source of truth landing independently of this call.
    });
  }, [contributionId, campaignId, verify]);

  useEffect(() => {
    if (!contributionId) return;
    const timer = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [contributionId]);

  const isUnauthorized = !!error && 'status' in error && (error.status === 401 || error.status === 403);

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
      {(isLoading || !contribution || status === ContributionStatus.PENDING) && !isError && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Loader2 className="size-7 animate-spin" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Confirming your contribution…</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {stuck
              ? "This is taking longer than expected — if you closed or canceled checkout, nothing was charged. We'll keep checking in the background."
              : "We're checking with the payment provider. This usually only takes a few seconds — no need to refresh."}
          </p>
          {stuck && (
            <Link href={`/campaigns/${campaignId}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-1')}>
              Back to campaign
            </Link>
          )}
        </EmptyPanel>
      )}

      {isError && !isLoading && !contribution && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">
            {isUnauthorized ? "That's not your contribution" : "Couldn't load this contribution"}
          </p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {isUnauthorized
              ? 'Log in as the account you started this contribution with to see its status here. Either way, check the campaign’s progress directly — it updates as soon as the gateway confirms your payment.'
              : "Check the campaign's progress directly — it updates as soon as the gateway confirms your payment."}
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
