'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VideoPlayerDialog } from '@/components/video-player-dialog';
import { useDeleteMediaAssetMutation } from '@/lib/redux/api';
import { IMAGE_MEDIA_ASSET_TYPES, MEDIA_ASSET_TYPE_LABELS } from '@/lib/types/enums';
import type { MediaAsset } from '@/lib/types/media-asset';
import type { Service } from '@/lib/types/service';

// One card per asset in the Media Asset Library grid — an actual image preview for
// PHOTO/GRAPHIC/THUMBNAIL; for VIDEO_CLIP/FULL_RECORDING, clicking plays it inline via
// VideoPlayerDialog rather than navigating away to YouTube/Facebook/etc.
export function MediaAssetCard({ asset, service }: { asset: MediaAsset; service?: Service }) {
  const [deleteAsset, { isLoading }] = useDeleteMediaAssetMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const isImage = IMAGE_MEDIA_ASSET_TYPES.includes(asset.type);

  async function handleDelete() {
    try {
      await deleteAsset(asset._id).unwrap();
      toast.success('Removed');
      setDeleteOpen(false);
    } catch {
      toast.error('Could not remove this asset.');
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote
        // Cloudinary URLs, not a local/known-domain asset next/image can optimize.
        <img src={asset.storage_url} alt="" className="h-40 w-full object-cover" />
      ) : (
        <button
          type="button"
          onClick={() => setPlayerOpen(true)}
          className="flex h-40 w-full cursor-pointer items-center justify-center gap-1.5 bg-muted text-muted-foreground hover:text-foreground"
        >
          <Play className="size-6" />
          <span className="text-body-sm">Play</span>
        </button>
      )}

      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge size="sm">{MEDIA_ASSET_TYPE_LABELS[asset.type]}</Badge>
          <Button
            size="icon-sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={isLoading}
            aria-label="Remove asset"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        {service && <p className="text-caption text-muted-foreground">{service.name}</p>}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="pending" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!isImage && (
        <VideoPlayerDialog
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          url={asset.storage_url}
          title={service?.name ?? MEDIA_ASSET_TYPE_LABELS[asset.type]}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this media asset?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
