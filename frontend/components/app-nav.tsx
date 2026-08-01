'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { cn } from '@/lib/utils';
import { MediaTeamMemberRole } from '@/lib/types/enums';

// Desktop/tablet only (sm and up) — a horizontally-scrolling tab row, mirroring
// protocol_dept_app's app-nav.tsx exactly. Below `sm`, MobileNavDrawer takes over
// instead. Grows as each phase adds a screen — mostly no role-based filtering yet
// (that's a later polish pass on top of Phase 7's guards, same as
// protocol_dept_app's own staging), except Contributions Ledger, which brief Section
// 4I scopes stricter than every other screen (Admin-only, not Admin+Director) — must
// only render for a confirmed logged-in identity, otherwise the internal nav leaks
// through on /login itself for a logged-out visitor.
const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/my-assignments', label: 'My Assignments' },
  { href: '/equipment', label: 'Equipment' },
  { href: '/media', label: 'Media Library' },
  { href: '/social-posts', label: 'Social Posts' },
  { href: '/team', label: 'Team' },
  { href: '/reports', label: 'Reports' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/contributions', label: 'Ledger', adminOnly: true },
];

export function AppNav() {
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) return null;

  const links = NAV_LINKS.filter((link) => !link.adminOnly || currentUser.role === MediaTeamMemberRole.ADMIN);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-14 z-30 hidden border-b border-border bg-background sm:block"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-4">
        {links.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-body-sm shrink-0 border-b-2 px-3 py-2.5 font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
