import { Radio } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ActingAsPicker } from '@/components/acting-as-picker';

// Persistent top nav — required home for the theme toggle per frontend/CLAUDE.md, and
// for the "Acting as" auth stand-in (see acting-as-picker.tsx) until Phase 7 replaces
// it with a real UserMenu, same as protocol_dept_app's own Phase 5 did.
//
// No church/department logo asset has been supplied yet — the Radio glyph is a
// placeholder brand mark, not a final logo; swap for a real image (see
// protocol_dept_app's app-header.tsx `next/image` usage) once one exists.
//
// Mobile note: the wordmark shortens to "Media Dept" below `sm` rather than
// disappearing entirely — the app's identity should stay visible even on a narrow
// phone screen (the actual field context this app is used in, per frontend/CLAUDE.md).
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="size-4.5" />
          </span>
          <span className="text-heading-md truncate text-foreground sm:hidden">Media Dept</span>
          <span className="text-heading-md hidden truncate text-foreground sm:inline">
            Media Department
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ActingAsPicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
