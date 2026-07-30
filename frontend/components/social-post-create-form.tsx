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
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useCreateSocialPostMutation, useGetMediaAssetsQuery, useGetPlatformsQuery } from '@/lib/redux/api';
import { MEDIA_ASSET_TYPE_LABELS, PLATFORM_NAME_LABELS } from '@/lib/types/enums';

// Drafts a new SocialPost (brief Section 5, screen 12) — always lands as DRAFT;
// scheduling/publishing happens afterward via SocialPostStatusActions on the card.
export function SocialPostCreateForm() {
  const { data: currentUser } = useCurrentUser();
  const { data: mediaAssets } = useGetMediaAssetsQuery();
  const { data: platforms } = useGetPlatformsQuery();
  const [createPost, { isLoading }] = useCreateSocialPostMutation();

  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  function resetForm() {
    setMediaAssetId(null);
    setPlatformId(null);
    setCaption('');
    setScheduledTime('');
  }

  async function handleSubmit() {
    if (!currentUser) {
      toast.error('Log in first to draft a social post.');
      return;
    }
    if (!mediaAssetId || !platformId || !caption.trim() || !scheduledTime) {
      toast.error('Fill in every field first.');
      return;
    }

    try {
      await createPost({
        media_asset: mediaAssetId,
        platform: platformId,
        caption: caption.trim(),
        scheduled_time: new Date(scheduledTime).toISOString(),
        posted_by: currentUser._id,
      }).unwrap();
      toast.success('Social post drafted');
      resetForm();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not draft this post.');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-heading-md text-foreground">Draft a social post</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <Label className="mb-1">Media asset</Label>
          <Select value={mediaAssetId} onValueChange={setMediaAssetId}>
            <SelectTrigger className="min-w-48">
              <SelectValue>
                {(value: string | null) => {
                  const asset = mediaAssets?.find((a) => a._id === value);
                  return asset
                    ? `${MEDIA_ASSET_TYPE_LABELS[asset.type]}${asset.tags.length ? ` — ${asset.tags.join(', ')}` : ''}`
                    : 'Choose an asset';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {mediaAssets?.map((asset) => (
                <SelectItem key={asset._id} value={asset._id}>
                  {MEDIA_ASSET_TYPE_LABELS[asset.type]}
                  {asset.tags.length ? ` — ${asset.tags.join(', ')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Platform</Label>
          <Select value={platformId} onValueChange={setPlatformId}>
            <SelectTrigger className="min-w-40">
              <SelectValue>
                {(value: string | null) => {
                  const platform = platforms?.find((p) => p._id === value);
                  return platform ? PLATFORM_NAME_LABELS[platform.name] : 'Choose a platform';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {platforms?.map((platform) => (
                <SelectItem key={platform._id} value={platform._id}>
                  {PLATFORM_NAME_LABELS[platform.name]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1">Scheduled for</Label>
          <Input
            type="datetime-local"
            className="w-auto"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>

        <div className="flex-1">
          <Label className="mb-1">Caption</Label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Highlights from this week's service! #FaithSeries"
          />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Drafting…' : 'Draft post'}
        </Button>
      </div>
    </div>
  );
}
