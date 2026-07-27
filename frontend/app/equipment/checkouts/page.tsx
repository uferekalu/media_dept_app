'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react';
import {
  useGetEquipmentCheckoutsQuery,
  useGetEquipmentQuery,
  useGetMediaTeamMembersQuery,
} from '@/lib/redux/api';
import { EquipmentCheckoutRow } from '@/components/equipment-checkout-row';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Equipment } from '@/lib/types/equipment';
import type { MediaTeamMember } from '@/lib/types/media-team-member';

// Equipment Checkout Log — brief Section 5: every checkout, active ones first so
// what's out and needs returning is immediately visible.
export default function EquipmentCheckoutsPage() {
  const {
    data: checkouts,
    isLoading: checkoutsLoading,
    isError,
    error,
    refetch,
  } = useGetEquipmentCheckoutsQuery();
  const { data: equipment } = useGetEquipmentQuery();
  const { data: members } = useGetMediaTeamMembersQuery();

  const equipmentById = useMemo(() => {
    const map = new Map<string, Equipment>();
    equipment?.forEach((e) => map.set(e._id, e));
    return map;
  }, [equipment]);

  const memberById = useMemo(() => {
    const map = new Map<string, MediaTeamMember>();
    members?.forEach((m) => map.set(m._id, m));
    return map;
  }, [members]);

  const active = (checkouts ?? []).filter((c) => !c.returned_at);
  const returned = (checkouts ?? []).filter((c) => c.returned_at);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/equipment"
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to inventory
      </Link>

      <h1 className="text-heading-lg text-foreground">Equipment Checkout Log</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Every checkout, who has what, and what&apos;s still out.
      </p>

      {checkoutsLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the checkout log</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!checkoutsLoading && !isError && (checkouts ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <ClipboardList className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No checkouts yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Check something out from the Inventory screen to see it here.
          </p>
        </EmptyPanel>
      )}

      {!checkoutsLoading && !isError && active.length > 0 && (
        <div className="flex flex-col gap-3">
          {active.map((checkout) => (
            <EquipmentCheckoutRow
              key={checkout._id}
              checkout={checkout}
              equipment={equipmentById.get(checkout.equipment)}
              member={memberById.get(checkout.checked_out_to)}
            />
          ))}
        </div>
      )}

      {!checkoutsLoading && !isError && returned.length > 0 && (
        <div className="mt-6">
          <h2 className="text-heading-md mb-3 text-foreground">Returned</h2>
          <div className="flex flex-col gap-2 opacity-70">
            {returned.map((checkout) => (
              <EquipmentCheckoutRow
                key={checkout._id}
                checkout={checkout}
                equipment={equipmentById.get(checkout.equipment)}
                member={memberById.get(checkout.checked_out_to)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
