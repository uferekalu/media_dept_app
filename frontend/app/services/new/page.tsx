'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { ServiceForm } from '@/components/service-form';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { MediaTeamMemberRole } from '@/lib/types/enums';

const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Create Service — brief Section 5 (screen 4). Admin/Director-only, enforced here
// (not just hidden behind a nav link) since the backend's own @Roles() guard is the
// real gate and this page should match it, not just assume nobody types the URL.
export default function NewServicePage() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const canCreate = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/services"
        className="text-body-sm mb-4 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to services
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Create a service</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Starts at Planned — crew, equipment, and broadcasts get set up afterward.
        </p>
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-2xl" />}

      {!isLoading && !canCreate && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <ShieldAlert className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Admin/Director access only</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Only Admin and Director can create a service.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && canCreate && <ServiceForm />}
    </main>
  );
}
