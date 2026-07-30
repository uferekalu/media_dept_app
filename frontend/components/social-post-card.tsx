'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
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
import { SocialPostStatusActions } from '@/components/social-post-status-actions';
import { useDeleteSocialPostMutation } from '@/lib/redux/api';
import {
  MEDIA_ASSET_TYPE_LABELS,
  PLATFORM_NAME_LABELS,
  SOCIAL_POST_STATUS_BADGE_VARIANT,
  SOCIAL_POST_STATUS_LABELS,
} from '@/lib/types/enums';
import type { SocialPost } from '@/lib/types/social-post';
import type { MediaAsset } from '@/lib/types/media-asset';
import type { Platform } from '@/lib/types/platform';

// One card per SocialPost on the Social Post Scheduler (brief Section 5, screen 12).
// Never uses a native browser confirm — see feedback_ui_polish_bar's standing rule.
export function SocialPostCard({
  post,
  mediaAsset,
  platform,
}: {
  post: SocialPost;
  mediaAsset: MediaAsset | undefined;
  platform: Platform | undefined;
}) {
  const [deletePost, { isLoading }] = useDeleteSocialPostMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    try {
      await deletePost(post._id).unwrap();
      toast.success('Social post removed');
      setDeleteOpen(false);
    } catch {
      toast.error('Could not remove this post.');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body font-medium text-foreground">{post.caption}</p>
          <p className="text-caption text-muted-foreground">
            {platform ? PLATFORM_NAME_LABELS[platform.name] : 'Unknown platform'}
            {mediaAsset ? ` · ${MEDIA_ASSET_TYPE_LABELS[mediaAsset.type]}` : ''}
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={isLoading}
          aria-label="Remove social post"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={SOCIAL_POST_STATUS_BADGE_VARIANT[post.status]} size="sm">
          {SOCIAL_POST_STATUS_LABELS[post.status]}
        </Badge>
        <p className="text-caption text-muted-foreground">
          {post.status === 'PUBLISHED' && post.published_time
            ? `Published ${format(new Date(post.published_time), 'MMM d, yyyy · h:mm a')}`
            : `Scheduled for ${format(new Date(post.scheduled_time), 'MMM d, yyyy · h:mm a')}`}
        </p>
      </div>

      <SocialPostStatusActions post={post} size="sm" />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this social post?</AlertDialogTitle>
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
