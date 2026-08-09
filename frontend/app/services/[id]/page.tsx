'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useDeleteServiceMutation,
  useGetRunOfShowForServiceQuery,
  useGetServiceQuery,
} from '@/lib/redux/api';
import { ServiceForm } from '@/components/service-form';
import { ServiceStatusStepper } from '@/components/service-status-stepper';
import { ServiceStatusActions } from '@/components/service-status-actions';
import { RunOfShowList } from '@/components/run-of-show-list';
import { RunOfShowItemForm } from '@/components/run-of-show-item-form';
import { RunOfShowDuplicateControl } from '@/components/run-of-show-duplicate-control';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { MediaTeamMemberRole, SERVICE_TYPE_LABELS } from '@/lib/types/enums';

const ELEVATED_ROLES: string[] = [MediaTeamMemberRole.ADMIN, MediaTeamMemberRole.DIRECTOR];

// Service Detail — brief Section 5 (screen 3): the hub every other Service-scoped
// screen (Crew, Broadcasts, Timeline) was previously only reachable from, with no way
// to actually get here first. Hosts the run-of-show builder (brief Section 4A)
// directly; Crew/Broadcasts/Timeline stay their own existing sub-pages, linked from here.
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const isElevated = !!currentUser && ELEVATED_ROLES.includes(currentUser.role);

  const { data: service, isLoading, isError, error, refetch } = useGetServiceQuery(id);
  const { data: runOfShow, isLoading: runOfShowLoading } = useGetRunOfShowForServiceQuery(id);
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();

  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteService(id).unwrap();
      toast.success('Service deleted');
      router.push('/services');
    } catch {
      toast.error('Could not delete this service.');
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/services"
        className="text-body-sm mb-4 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to services
      </Link>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3 rounded-md" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this service</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This service no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && service && editing && (
        <div className="flex flex-col gap-3">
          <p className="text-heading-md text-foreground">Edit service</p>
          <ServiceForm service={service} />
          <Button variant="outline" onClick={() => setEditing(false)} className="w-fit">
            Cancel
          </Button>
        </div>
      )}

      {!isLoading && !isError && service && !editing && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-heading-lg text-foreground">{service.name}</h1>
                <p className="text-caption text-muted-foreground">
                  {SERVICE_TYPE_LABELS[service.type]} · {service.venue}
                </p>
              </div>
              {isElevated && (
                <div className="flex shrink-0 gap-2">
                  <Button size="icon-sm" variant="outline" aria-label="Edit service" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Delete service"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <p className="text-body-sm mb-4 text-muted-foreground">
              {format(new Date(service.date), 'EEEE, MMM d, yyyy')} ·{' '}
              {format(new Date(service.start_time), 'h:mm a')} – {format(new Date(service.end_time), 'h:mm a')}
            </p>

            {(service.speaker || service.series) && (
              <p className="text-body-sm mb-4 text-muted-foreground">
                {service.speaker}
                {service.speaker && service.series ? ' · ' : ''}
                {service.series}
              </p>
            )}

            {service.description && <p className="text-body-sm mb-4 text-foreground">{service.description}</p>}

            <ServiceStatusStepper status={service.status} />

            {isElevated && (
              <div className="mt-4 border-t border-border pt-4">
                <ServiceStatusActions service={service} size="sm" />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-4">
              <Link href={`/services/${id}/timeline`} className="text-body-sm text-primary hover:underline">
                View timeline
              </Link>
              <Link href={`/services/${id}/crew`} className="text-body-sm text-primary hover:underline">
                Manage crew
              </Link>
              <Link href={`/services/${id}/broadcasts`} className="text-body-sm text-primary hover:underline">
                Manage broadcasts
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-heading-md mb-3 text-foreground">Run of Show</h2>

            {runOfShowLoading && (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!runOfShowLoading && (
              <div className="flex flex-col gap-3">
                <RunOfShowList service={service} items={runOfShow ?? []} canEdit={isElevated} />

                {isElevated && (runOfShow ?? []).length === 0 && (
                  <RunOfShowDuplicateControl targetServiceId={service._id} />
                )}

                {isElevated && (
                  <RunOfShowItemForm service={service} nextOrder={(runOfShow ?? []).length + 1} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Any run-of-show segments, crew assignments, or broadcasts already linked to
              this service are not deleted along with it and will become orphaned records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
