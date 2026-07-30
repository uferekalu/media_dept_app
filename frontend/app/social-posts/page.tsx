'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { useGetMediaAssetsQuery, useGetPlatformsQuery, useGetSocialPostsQuery } from '@/lib/redux/api';
import { SocialPostCreateForm } from '@/components/social-post-create-form';
import { SocialPostCard } from '@/components/social-post-card';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORM_NAME_LABELS, SOCIAL_POST_STATUS_LABELS, SocialPostStatus } from '@/lib/types/enums';
import type { MediaAsset } from '@/lib/types/media-asset';
import type { Platform } from '@/lib/types/platform';

// Sentinel values for the "clear this filter" option — Base UI's Select needs a real
// item value to render/select, it can't bind a SelectItem directly to null.
const ALL_PLATFORMS = 'ALL_PLATFORMS';
const ALL_STATUSES = 'ALL_STATUSES';

// Social Post Scheduler — brief Section 5 (screen 12): draft a post referencing a
// media asset and platform, then walk it through Draft -> Scheduled -> Published.
export default function SocialPostsPage() {
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | null>(null);

  const {
    data: posts,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetSocialPostsQuery({
    platform: platformFilter ?? undefined,
    status: statusFilter ?? undefined,
  });
  const { data: mediaAssets } = useGetMediaAssetsQuery();
  const { data: platforms } = useGetPlatformsQuery();

  const mediaAssetById = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    mediaAssets?.forEach((a) => map.set(a._id, a));
    return map;
  }, [mediaAssets]);

  const platformById = useMemo(() => {
    const map = new Map<string, Platform>();
    platforms?.forEach((p) => map.set(p._id, p));
    return map;
  }, [platforms]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Social Posts</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Draft, schedule, and publish social content across platforms.
        </p>
      </div>

      <div className="mb-6">
        <SocialPostCreateForm />
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Platform</Label>
          <Select
            value={platformFilter ?? ALL_PLATFORMS}
            onValueChange={(v) => setPlatformFilter(!v || v === ALL_PLATFORMS ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-40">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_PLATFORMS
                    ? 'All platforms'
                    : (platformById.get(value) ? PLATFORM_NAME_LABELS[platformById.get(value)!.name] : 'All platforms')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PLATFORMS}>All platforms</SelectItem>
              {platforms?.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {PLATFORM_NAME_LABELS[p.name]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Status</Label>
          <Select
            value={statusFilter ?? ALL_STATUSES}
            onValueChange={(v) =>
              setStatusFilter(!v || v === ALL_STATUSES ? null : (v as SocialPostStatus))
            }
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-36">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_STATUSES
                    ? 'All statuses'
                    : SOCIAL_POST_STATUS_LABELS[value as SocialPostStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
              {Object.values(SocialPostStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {SOCIAL_POST_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load social posts</p>
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

      {!isLoading && !isError && (posts ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Send className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No social posts yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Draft one above to get started.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && (posts ?? []).length > 0 && (
        <div className="flex flex-col gap-3">
          {posts!.map((post) => (
            <SocialPostCard
              key={post._id}
              post={post}
              mediaAsset={mediaAssetById.get(post.media_asset)}
              platform={platformById.get(post.platform)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
