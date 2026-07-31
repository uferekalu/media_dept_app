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
import { useCreateContributionCampaignMutation, useGetEquipmentQuery } from '@/lib/redux/api';
import {
  CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS,
  ContributionCampaignPurposeCategory,
} from '@/lib/types/enums';

const NO_EQUIPMENT = 'NO_EQUIPMENT';

// Creates a ContributionCampaign (brief Section 4I) — Admin/Director only, enforced
// both by the page that renders this form and by the backend's own @Roles() guard.
// Amount is entered in whole Naira (a Protocol member shouldn't have to think in kobo)
// and multiplied by 100 right before it hits the wire, matching how every other kobo
// field in this app is stored.
export function ContributionCampaignCreateForm() {
  const { data: equipment } = useGetEquipmentQuery();
  const [createCampaign, { isLoading }] = useCreateContributionCampaignMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purposeCategory, setPurposeCategory] = useState<ContributionCampaignPurposeCategory | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [targetNaira, setTargetNaira] = useState('');

  function resetForm() {
    setTitle('');
    setDescription('');
    setPurposeCategory(null);
    setEquipmentId(null);
    setTargetNaira('');
  }

  async function handleSubmit() {
    const targetAmount = Math.round(Number(targetNaira) * 100);
    if (!title.trim() || !purposeCategory || !targetNaira || !(targetAmount > 0)) {
      toast.error('Fill in a title, purpose, and a target amount above ₦0.');
      return;
    }

    try {
      await createCampaign({
        title: title.trim(),
        description: description.trim() || undefined,
        purpose_category: purposeCategory,
        equipment: equipmentId ?? undefined,
        target_amount: targetAmount,
      }).unwrap();
      toast.success('Campaign created');
      resetForm();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not create this campaign.');
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-heading-md text-foreground">Start a campaign</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1">
          <Label className="mb-1.5">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Camera Repair Fund"
          />
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Purpose</Label>
          <Select value={purposeCategory} onValueChange={(v) => setPurposeCategory(v as ContributionCampaignPurposeCategory)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-44">
              <SelectValue>
                {(value: string | null) =>
                  value
                    ? CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS[value as ContributionCampaignPurposeCategory]
                    : 'Choose a purpose'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(ContributionCampaignPurposeCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {CONTRIBUTION_CAMPAIGN_PURPOSE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Tied to equipment (optional)</Label>
          <Select
            value={equipmentId ?? NO_EQUIPMENT}
            onValueChange={(v) => setEquipmentId(!v || v === NO_EQUIPMENT ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-44">
              <SelectValue>
                {(value: string | null) => {
                  if (!value || value === NO_EQUIPMENT) return 'None';
                  const item = equipment?.find((e) => e._id === value);
                  return item ? item.name : 'None';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_EQUIPMENT}>None</SelectItem>
              {equipment?.map((item) => (
                <SelectItem key={item._id} value={item._id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Target amount (₦)</Label>
          <Input
            type="number"
            min={1}
            className="w-full sm:w-36"
            value={targetNaira}
            onChange={(e) => setTargetNaira(e.target.value)}
            placeholder="150000"
          />
        </div>

        <div className="w-full">
          <Label className="mb-1.5">Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Repairing the gimbal mount on Camera 2 after the drop at the Easter Revival."
          />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Creating…' : 'Create campaign'}
        </Button>
      </div>
    </div>
  );
}
