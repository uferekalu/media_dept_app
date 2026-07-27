'use client';

import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReturnEquipmentCheckoutMutation } from '@/lib/redux/api';
import type { Equipment } from '@/lib/types/equipment';
import type { EquipmentCheckout } from '@/lib/types/equipment-checkout';
import type { MediaTeamMember } from '@/lib/types/media-team-member';

// One row per checkout on the Equipment Checkout Log screen (brief Section 5) —
// active checkouts get a "Return" action, closed-out ones just show when they came
// back.
export function EquipmentCheckoutRow({
  checkout,
  equipment,
  member,
}: {
  checkout: EquipmentCheckout;
  equipment: Equipment | undefined;
  member: MediaTeamMember | undefined;
}) {
  const [returnEquipment, { isLoading }] = useReturnEquipmentCheckoutMutation();

  async function handleReturn() {
    try {
      await returnEquipment({ id: checkout._id }).unwrap();
      toast.success(`${equipment?.name ?? 'Equipment'} returned`);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not mark this returned.');
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body font-medium text-foreground">{equipment?.name ?? 'Unknown equipment'}</p>
          <p className="text-body-sm text-muted-foreground">
            Checked out to {member?.full_name ?? 'Unknown member'}
          </p>
        </div>
        {checkout.returned_at ? (
          <Badge variant="complete">Returned</Badge>
        ) : (
          <Badge variant="in-progress">Checked Out</Badge>
        )}
      </div>

      <p className="text-body-sm mt-1 text-muted-foreground">
        Checked out {new Date(checkout.checked_out_at).toLocaleString()} — expected back{' '}
        {new Date(checkout.expected_return_at).toLocaleString()}
      </p>
      {checkout.returned_at && (
        <p className="text-body-sm text-muted-foreground">
          Returned {new Date(checkout.returned_at).toLocaleString()}
        </p>
      )}
      {checkout.notes && <p className="text-body-sm mt-1 text-muted-foreground">{checkout.notes}</p>}

      {!checkout.returned_at && (
        <div className="mt-2">
          <Button size="sm" onClick={handleReturn} disabled={isLoading}>
            Mark Returned
          </Button>
        </div>
      )}
    </div>
  );
}
