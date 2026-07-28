'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Images, LayoutDashboard, ListChecks, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mirrors app-nav.tsx's link list — kept as a separate array (not shared) since the
// two components' link shape differs (this one needs an icon per link, the desktop
// tab row doesn't).
const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-assignments', label: 'My Assignments', icon: ListChecks },
  { href: '/equipment', label: 'Equipment', icon: Package },
  { href: '/media', label: 'Media Library', icon: Images },
];

const STORAGE_KEY = 'media-department:mobile-nav-expanded';

// Below `sm` only (see app-nav.tsx, which is desktop/tablet-only) — a collapsible
// icon-rail sidebar flush against the left edge, mirroring protocol_dept_app's
// mobile-nav-drawer.tsx exactly. Collapsed, it sits side-by-side with page content
// (content reserves exactly its width via the `pl-14` wrapper in app/providers.tsx).
// Expanded, it overlays on top of content instead of pushing/resizing it.
export function MobileNavDrawer() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Hydrate the user's last preference from localStorage on mount only — starts
  // collapsed during SSR/first paint to avoid a hydration mismatch.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'true') setExpanded(true);
  }, []);

  function setExpandedAndPersist(next: boolean) {
    setExpanded(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }

  function toggle() {
    setExpandedAndPersist(!expanded);
  }

  // Close on an outside click/tap — better mobile UX than requiring the user to find
  // the chevron again. Only listens while expanded, and checks containment against
  // the nav element itself, so it also closes on a tap anywhere else in the page.
  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setExpandedAndPersist(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [expanded]);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className={cn(
        'fixed top-14 bottom-0 left-0 z-40 flex flex-col overflow-hidden bg-card text-card-foreground shadow-md ring-1 ring-foreground/10 transition-[width] duration-200 ease-out sm:hidden',
        expanded ? 'w-56' : 'w-14',
      )}
    >
      <div className="flex flex-col gap-1 p-2">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              // Closes the drawer on link-tap, same as the desktop click behavior a
              // navigation should have — built in from the start here rather than
              // shipped as a follow-up fix like protocol_dept_app's had to be.
              onClick={() => setExpandedAndPersist(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg py-2.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                expanded ? 'px-2.5' : 'justify-center',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span
                className={cn(
                  'text-body-sm overflow-hidden font-medium whitespace-nowrap transition-opacity duration-150',
                  expanded ? 'opacity-100 delay-100' : 'w-0 opacity-0',
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className={cn('flex border-t border-border p-2', expanded ? 'justify-start' : 'justify-center')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          {expanded ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
        </Button>
      </div>
    </nav>
  );
}
