'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Images, RefreshCw } from 'lucide-react';
import { useGetMediaAssetsQuery, useGetServicesQuery } from '@/lib/redux/api';
import { MediaAssetUploadForm } from '@/components/media-asset-upload-form';
import { MediaAssetCard } from '@/components/media-asset-card';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
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
import { MEDIA_ASSET_TYPE_LABELS, MediaAssetType } from '@/lib/types/enums';
import type { Service } from '@/lib/types/service';

// Sentinel values for the "clear this filter" option — Base UI's Select needs a real
// item value to render/select, it can't bind a SelectItem directly to null.
const ALL_TYPES = 'ALL_TYPES';
const ALL_SERVICES = 'ALL_SERVICES';

// Media Asset Library — brief Section 5: upload, tag, search. Filters by service and
// type via query params (server-side); tag search is client-side substring match
// across each asset's tags for a snappier "type to filter" feel than round-tripping
// per keystroke.
export default function MediaLibraryPage() {
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState('');

  const {
    data: assets,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMediaAssetsQuery({
    type: typeFilter ?? undefined,
    service: serviceFilter ?? undefined,
  });
  const { data: services } = useGetServicesQuery();

  const serviceById = useMemo(() => {
    const map = new Map<string, Service>();
    services?.forEach((s) => map.set(s._id, s));
    return map;
  }, [services]);

  const visibleAssets = (assets ?? []).filter((asset) =>
    tagSearch.trim()
      ? asset.tags.some((tag) => tag.toLowerCase().includes(tagSearch.trim().toLowerCase()))
      : true,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-heading-lg text-foreground">Media Asset Library</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Photos, graphics, clips, and full recordings — upload, tag, and find them
            again.
          </p>
        </div>
        <Link href="/media/archive" className="text-body-sm text-primary hover:underline">
          View VOD archive
        </Link>
      </div>

      <div className="mb-6">
        <MediaAssetUploadForm />
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Type</Label>
          <Select
            value={typeFilter ?? ALL_TYPES}
            onValueChange={(v) => setTypeFilter(!v || v === ALL_TYPES ? null : (v as MediaAssetType))}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-40">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_TYPES ? 'All types' : MEDIA_ASSET_TYPE_LABELS[value as MediaAssetType]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All types</SelectItem>
              {Object.values(MediaAssetType).map((t) => (
                <SelectItem key={t} value={t}>
                  {MEDIA_ASSET_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Service</Label>
          <Select
            value={serviceFilter ?? ALL_SERVICES}
            onValueChange={(v) => setServiceFilter(v === ALL_SERVICES ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-44">
              <SelectValue>
                {(value: string | null) =>
                  !value || value === ALL_SERVICES
                    ? 'All services'
                    : (services?.find((s) => s._id === value)?.name ?? 'All services')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SERVICES}>All services</SelectItem>
              {services?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="mb-1.5">Search tags</Label>
          <Input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="e.g. faith series" />
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the library</p>
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

      {!isLoading && !isError && visibleAssets.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Images className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Nothing here yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Add a photo, graphic, or video link above to start building the library.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && visibleAssets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleAssets.map((asset) => (
            <MediaAssetCard
              key={asset._id}
              asset={asset}
              service={asset.service ? serviceById.get(asset.service) : undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
}
