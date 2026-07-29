'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight, RefreshCw, Users } from 'lucide-react';
import { useGetMediaTeamMembersQuery } from '@/lib/redux/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { MEDIA_TEAM_MEMBER_ROLE_LABELS } from '@/lib/constants/media-team-member';

// Team Directory — brief Section 5 (screen 13): read-only, open to every logged-in
// role (brief Section 4H — everyone can see who else is in the department). Editing
// lives on /team/[id], scoped to self or an Admin changing someone else's role.
export default function TeamPage() {
  const { data: members, isLoading, isError, error, refetch } = useGetMediaTeamMembersQuery();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Team</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Everyone in the Media Department.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the team</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && members && members.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Users className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No one has joined yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Media Team Members show up here once they sign up.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && members && members.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          {members.map((member) => (
            <Link
              key={member._id}
              href={`/team/${member._id}`}
              className="flex items-center gap-3 border-b border-border p-3 last:border-0 hover:bg-muted/50"
            >
              <Avatar imageUrl={member.image_url} name={member.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{member.full_name}</p>
                <p className="text-caption truncate text-muted-foreground">
                  {member.phone_number}
                </p>
              </div>
              <Badge className="shrink-0">{MEDIA_TEAM_MEMBER_ROLE_LABELS[member.role]}</Badge>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
