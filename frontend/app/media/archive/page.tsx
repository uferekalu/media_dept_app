'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertTriangle, ArrowLeft, Film, Play, RefreshCw } from 'lucide-react';
import { useGetFullRecordingsQuery, useGetServicesQuery } from '@/lib/redux/api';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { VideoPlayerDialog } from '@/components/video-player-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { MediaAsset } from '@/lib/types/media-asset';
import type { Service } from '@/lib/types/service';

// VOD Archive — brief Section 5: past services with their full recording link and
// metadata, most recent first. Plays inline (VideoPlayerDialog) rather than sending
// the user away from the app to watch it.
export default function VodArchivePage() {
  const {
    data: recordings,
    isLoading: recordingsLoading,
    isError,
    error,
    refetch,
  } = useGetFullRecordingsQuery();
  const { data: services } = useGetServicesQuery();
  const [nowPlaying, setNowPlaying] = useState<MediaAsset | null>(null);

  const serviceById = useMemo(() => {
    const map = new Map<string, Service>();
    services?.forEach((s) => map.set(s._id, s));
    return map;
  }, [services]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/media"
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <h1 className="text-heading-lg text-foreground">VOD Archive</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Every full recording, most recent first.
      </p>

      {recordingsLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the archive</p>
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

      {!recordingsLoading && !isError && (recordings ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Film className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No recordings yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Add a Full Recording link from the Media Asset Library to see it here.
          </p>
        </EmptyPanel>
      )}

      {!recordingsLoading && !isError && (recordings ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          {recordings!.map((recording) => {
            const service = recording.service ? serviceById.get(recording.service) : undefined;
            return (
              <button
                key={recording._id}
                type="button"
                onClick={() => setNowPlaying(recording)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium text-foreground">
                    {service?.name ?? 'Recording (no linked service)'}
                  </p>
                  <p className="text-body-sm text-muted-foreground">
                    {service ? format(new Date(service.date), 'EEEE, MMM d, yyyy') : ''}
                    {service && recording.tags.length > 0 ? ' · ' : ''}
                    {recording.tags.join(', ')}
                  </p>
                </div>
                <Play className="size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      {nowPlaying && (
        <VideoPlayerDialog
          open={Boolean(nowPlaying)}
          onOpenChange={(open) => !open && setNowPlaying(null)}
          url={nowPlaying.storage_url}
          title={
            (nowPlaying.service ? serviceById.get(nowPlaying.service)?.name : undefined) ??
            'Full Recording'
          }
        />
      )}
    </main>
  );
}
