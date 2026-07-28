'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getEmbedInfo } from '@/lib/video-embed';

// Plays a VIDEO_CLIP/FULL_RECORDING's pasted URL inline, in-app — the user
// specifically flagged clicking a video sending them away to YouTube/etc. as broken
// UX. Works for YouTube/Vimeo/Facebook (iframe embed) and falls back to a native
// <video> element for a direct file link.
export function VideoPlayerDialog({
  open,
  onOpenChange,
  url,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}) {
  const embed = getEmbedInfo(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        {/* Visually hidden but present for screen readers — the video itself is the
            visible content, a redundant on-screen title would be noise. */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {embed.kind === 'iframe' ? (
            <iframe
              src={embed.src}
              title={title}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- arbitrary
            // pasted URL, no caption track available.
            <video src={embed.src} controls autoPlay className="size-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
