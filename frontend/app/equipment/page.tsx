'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import {
  useCreateEquipmentMutation,
  useGetEquipmentQuery,
  useGetMediaTeamMembersQuery,
} from '@/lib/redux/api';
import { EquipmentRow } from '@/components/equipment-row';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EQUIPMENT_CATEGORY_LABELS, EquipmentCategory } from '@/lib/types/enums';

// Equipment Inventory — brief Section 5: list, condition, current checkout status,
// plus adding new items to the inventory.
export default function EquipmentPage() {
  const { data: equipment, isLoading, isError, error, refetch } = useGetEquipmentQuery();
  const { data: members } = useGetMediaTeamMembersQuery();
  const [createEquipment, { isLoading: isCreating }] = useCreateEquipmentMutation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>(EquipmentCategory.CAMERA);
  const [serialNumber, setSerialNumber] = useState('');

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      await createEquipment({
        name: name.trim(),
        category,
        serial_number: serialNumber.trim() || undefined,
      }).unwrap();
      toast.success(`${name} added to the inventory`);
      setName('');
      setSerialNumber('');
    } catch {
      toast.error('Could not add this equipment.');
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-heading-lg text-foreground">Equipment Inventory</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Cameras, mics, tripods, and everything else — condition, availability, and
            checkout status at a glance.
          </p>
        </div>
        {equipment && equipment.length > 0 && <Badge>{equipment.length} items</Badge>}
      </div>

      <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <p className="text-heading-md text-foreground">Add equipment</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="mb-1">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Canon C70 #2"
            />
          </div>
          <div>
            <Label className="mb-1">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EquipmentCategory)}>
              <SelectTrigger className="min-w-36">
                <SelectValue>{() => EQUIPMENT_CATEGORY_LABELS[category]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(EquipmentCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {EQUIPMENT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="mb-1">Serial number (optional)</Label>
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={!name.trim() || isCreating}>
            Add
          </Button>
        </div>
      </div>

      {isLoading && (
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
          <p className="text-heading-md text-foreground">Couldn&apos;t load the inventory</p>
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

      {!isLoading && !isError && equipment && equipment.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Package className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No equipment yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Add your first item above to start tracking it.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && equipment && equipment.length > 0 && (
        <div className="flex flex-col gap-2">
          {equipment.map((item) => (
            <EquipmentRow key={item._id} equipment={item} members={members} />
          ))}
        </div>
      )}

      <Link
        href="/equipment/checkouts"
        className="text-body-sm mt-6 inline-block text-primary hover:underline"
      >
        View checkout log
      </Link>
    </main>
  );
}
