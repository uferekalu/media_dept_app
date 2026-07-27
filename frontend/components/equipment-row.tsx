'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateEquipmentCheckoutMutation,
  useDeleteEquipmentMutation,
  useUpdateEquipmentMutation,
} from '@/lib/redux/api';
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CONDITION_BADGE_VARIANT,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_CURRENT_STATUS_BADGE_VARIANT,
  EQUIPMENT_CURRENT_STATUS_LABELS,
  EquipmentCondition,
  EquipmentCurrentStatus,
} from '@/lib/types/enums';
import type { Equipment } from '@/lib/types/equipment';
import type { MediaTeamMember } from '@/lib/types/media-team-member';

// One row per piece of equipment on the Inventory screen (brief Section 5) —
// condition/current_status are directly editable inline (no separate guarded status
// endpoint for Equipment, unlike Service/Broadcast/CrewAssignment), plus a "Check Out"
// action that only shows once the item is actually AVAILABLE.
export function EquipmentRow({
  equipment,
  members,
}: {
  equipment: Equipment;
  members: MediaTeamMember[] | undefined;
}) {
  const [updateEquipment] = useUpdateEquipmentMutation();
  const [deleteEquipment, { isLoading: isDeleting }] = useDeleteEquipmentMutation();
  const [createCheckout, { isLoading: isCheckingOut }] = useCreateEquipmentCheckoutMutation();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMemberId, setCheckoutMemberId] = useState<string | null>(null);
  const [expectedReturnAt, setExpectedReturnAt] = useState('');

  async function handleConditionChange(condition: EquipmentCondition | null) {
    if (!condition) return;
    try {
      await updateEquipment({ id: equipment._id, condition }).unwrap();
    } catch {
      toast.error('Could not update condition.');
    }
  }

  async function handleCurrentStatusChange(current_status: EquipmentCurrentStatus | null) {
    if (!current_status) return;
    try {
      await updateEquipment({ id: equipment._id, current_status }).unwrap();
    } catch {
      toast.error('Could not update status.');
    }
  }

  async function handleCheckout() {
    if (!checkoutMemberId || !expectedReturnAt) return;
    try {
      await createCheckout({
        equipment: equipment._id,
        checked_out_to: checkoutMemberId,
        expected_return_at: new Date(expectedReturnAt).toISOString(),
      }).unwrap();
      toast.success(`${equipment.name} checked out`);
      setCheckoutOpen(false);
      setCheckoutMemberId(null);
      setExpectedReturnAt('');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not check out this equipment.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove ${equipment.name} from the inventory?`)) return;
    try {
      await deleteEquipment(equipment._id).unwrap();
      toast.success('Equipment removed');
    } catch {
      toast.error('Could not remove this equipment.');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-foreground">{equipment.name}</p>
          <p className="text-caption text-muted-foreground">
            {EQUIPMENT_CATEGORY_LABELS[equipment.category]}
            {equipment.serial_number ? ` · ${equipment.serial_number}` : ''}
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Remove ${equipment.name}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={EQUIPMENT_CONDITION_BADGE_VARIANT[equipment.condition]} size="sm">
          {EQUIPMENT_CONDITION_LABELS[equipment.condition]}
        </Badge>
        <Badge variant={EQUIPMENT_CURRENT_STATUS_BADGE_VARIANT[equipment.current_status]} size="sm">
          {EQUIPMENT_CURRENT_STATUS_LABELS[equipment.current_status]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={equipment.condition} onValueChange={handleConditionChange}>
          <SelectTrigger size="sm" className="min-w-36">
            <SelectValue>{() => EQUIPMENT_CONDITION_LABELS[equipment.condition]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.values(EquipmentCondition).map((c) => (
              <SelectItem key={c} value={c}>
                {EQUIPMENT_CONDITION_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={equipment.current_status} onValueChange={handleCurrentStatusChange}>
          <SelectTrigger size="sm" className="min-w-36">
            <SelectValue>{() => EQUIPMENT_CURRENT_STATUS_LABELS[equipment.current_status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.values(EquipmentCurrentStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {EQUIPMENT_CURRENT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {equipment.current_status === EquipmentCurrentStatus.AVAILABLE && !checkoutOpen && (
          <Button size="sm" onClick={() => setCheckoutOpen(true)}>
            Check Out
          </Button>
        )}
      </div>

      {checkoutOpen && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2">
          <Select value={checkoutMemberId} onValueChange={setCheckoutMemberId}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue>
                {(value: string | null) =>
                  members?.find((m) => m._id === value)?.full_name ?? 'Checked out to'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {members?.map((member) => (
                <SelectItem key={member._id} value={member._id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            className="w-auto"
            value={expectedReturnAt}
            onChange={(e) => setExpectedReturnAt(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleCheckout}
            disabled={!checkoutMemberId || !expectedReturnAt || isCheckingOut}
          >
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCheckoutOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
