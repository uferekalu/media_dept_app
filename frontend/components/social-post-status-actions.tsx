'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateSocialPostStatusMutation } from '@/lib/redux/api';
import { SOCIAL_POST_STATUS_ACTION_LABELS, VALID_SOCIAL_POST_STATUS_TRANSITIONS } from '@/lib/types/enums';
import type { SocialPost } from '@/lib/types/social-post';
import type { SocialPostStatus } from '@/lib/types/enums';

// Shared guarded status-advance control for SocialPosts — mirrors
// broadcast-status-actions.tsx / crew-assignment-status-actions.tsx. DRAFT offers two
// buttons (Schedule or Mark Published directly) since both are valid next steps.
export function SocialPostStatusActions({ post, size = 'sm' }: { post: SocialPost; size?: 'sm' | 'lg' }) {
  const [updateStatus, { isLoading }] = useUpdateSocialPostStatusMutation();
  const nextStatuses = VALID_SOCIAL_POST_STATUS_TRANSITIONS[post.status];

  async function handleAdvance(next: SocialPostStatus) {
    try {
      await updateStatus({ id: post._id, status: next }).unwrap();
      toast.success(SOCIAL_POST_STATUS_ACTION_LABELS[next]);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update this post.');
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-caption text-muted-foreground">Published</p>;
  }

  return (
    <div className={size === 'lg' ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size={size === 'lg' ? 'lg' : 'sm'}
          variant={next === 'PUBLISHED' ? 'default' : 'outline'}
          onClick={() => handleAdvance(next)}
          disabled={isLoading}
          className={size === 'lg' ? 'h-16 flex-1 text-body font-semibold' : ''}
        >
          {SOCIAL_POST_STATUS_ACTION_LABELS[next]}
        </Button>
      ))}
    </div>
  );
}
