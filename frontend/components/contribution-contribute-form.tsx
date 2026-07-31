'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInitiateContributionMutation } from '@/lib/redux/api';
import { CONTRIBUTION_PROVIDER_LABELS, ContributionProvider } from '@/lib/types/enums';

// Starts a Contribution against an ACTIVE campaign (brief Section 4I). Never collects
// card details itself — initiate() returns a gateway-hosted checkout_url, and this
// component does a full page redirect to it (window.location.href, not client-side
// routing) since the contributor is leaving this app entirely for the gateway's own
// page. Amount is entered in whole Naira and converted to kobo right before it hits
// the wire, matching the create-campaign form's convention.
export function ContributionContributeForm({ campaignId }: { campaignId: string }) {
  const [initiate, { isLoading }] = useInitiateContributionMutation();

  const [amountNaira, setAmountNaira] = useState('');
  const [provider, setProvider] = useState<ContributionProvider | null>(null);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    const amount = Math.round(Number(amountNaira) * 100);
    if (!(amount >= 100) || !provider || !email.trim()) {
      toast.error('Enter an amount (at least ₦1), choose a payment method, and enter your email.');
      return;
    }

    try {
      const contribution = await initiate({
        campaign: campaignId,
        amount,
        provider,
        email: email.trim(),
        notes: notes.trim() || undefined,
      }).unwrap();

      if (!contribution.checkout_url) {
        toast.error('The gateway did not return a checkout page. Please try again.');
        return;
      }

      window.location.href = contribution.checkout_url;
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not start this contribution.');
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-heading-md text-foreground">Contribute</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Amount (₦)</Label>
          <Input
            type="number"
            min={1}
            className="w-full sm:w-36"
            value={amountNaira}
            onChange={(e) => setAmountNaira(e.target.value)}
            placeholder="5000"
          />
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Payment method</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as ContributionProvider)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-36">
              <SelectValue>
                {(value: string | null) =>
                  value ? CONTRIBUTION_PROVIDER_LABELS[value as ContributionProvider] : 'Choose a method'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(ContributionProvider).map((p) => (
                <SelectItem key={p} value={p}>
                  {CONTRIBUTION_PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto sm:flex-1">
          <Label className="mb-1.5">Email (for your receipt)</Label>
          <Input
            type="email"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="w-full">
          <Label className="mb-1.5">Note (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="For the new tripod"
          />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Starting…' : 'Continue to payment'}
        </Button>
      </div>
    </div>
  );
}
