import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our custom typography utilities (app/globals.css) are all `text-*`-prefixed, which
// is also the prefix Tailwind's real text-color utilities use (text-primary-foreground,
// text-foreground, ...). Plain tailwind-merge doesn't know these are font-size, not
// color, so it buckets them together and — when both appear on the same element (e.g.
// a Button using `text-body` for size alongside its variant's `text-primary-foreground`
// for color) — drops whichever comes last as a "conflict", silently losing the color
// declaration. Registering them under 'font-size' fixes this for every component, not
// just the one it was first noticed on.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-heading-lg',
        'text-heading-md',
        'text-body',
        'text-body-sm',
        'text-label',
        'text-caption',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
