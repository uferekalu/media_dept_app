// Converts a pasted video URL (VIDEO_CLIP/FULL_RECORDING's storage_url — see
// enums.ts's VIDEO_MEDIA_ASSET_TYPES) into something playable inline, instead of
// sending the user away from the app to watch it. Recognizes the platforms this app
// actually streams to (YouTube, Facebook) plus Vimeo; anything else falls back to a
// native <video> element, which handles a direct .mp4/.webm/etc. link.
export interface EmbedInfo {
  kind: 'iframe' | 'video';
  src: string;
}

export function getEmbedInfo(url: string): EmbedInfo {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').pop();
      if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }

    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }

    if (host === 'facebook.com' || host === 'fb.watch') {
      // Facebook's public embed plugin works for public videos without an app id.
      return {
        kind: 'iframe',
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      };
    }
  } catch {
    // Not a parseable URL — fall through to the <video> fallback below, same as any
    // other unrecognized host.
  }

  return { kind: 'video', src: url };
}
