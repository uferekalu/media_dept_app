'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { RunOfShowItemForm } from '@/components/run-of-show-item-form';
import { useDeleteRunOfShowItemMutation } from '@/lib/redux/api';
import type { RunOfShowItem } from '@/lib/types/run-of-show-item';
import type { Service } from '@/lib/types/service';

// Ordered segment list for a Service's run-of-show (brief Section 4A) — visible to
// any authenticated role, edit/delete only rendered when `canEdit` (Admin/Director,
// checked by the page rendering this).
export function RunOfShowList({
  service,
  items,
  canEdit,
}: {
  service: Service;
  items: RunOfShowItem[];
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<RunOfShowItem | null>(null);
  const [deleteItem, { isLoading: isDeleting }] = useDeleteRunOfShowItemMutation();

  const sorted = [...items].sort((a, b) => a.order - b.order);

  async function handleDelete() {
    if (!deletingItem) return;
    try {
      await deleteItem({ id: deletingItem._id, serviceId: service._id }).unwrap();
      toast.success('Segment removed');
      setDeletingItem(null);
    } catch {
      toast.error('Could not remove this segment.');
    }
  }

  if (sorted.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No run-of-show segments yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item) =>
        editingId === item._id ? (
          <RunOfShowItemForm
            key={item._id}
            service={service}
            item={item}
            nextOrder={sorted.length + 1}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <div
            key={item._id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-caption font-semibold text-muted-foreground">
              {item.order}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{item.segment_name}</p>
              <p className="text-caption truncate text-muted-foreground">
                {new Date(item.scheduled_start_time).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                &middot; {item.duration_minutes} min
                {item.graphics_notes ? ` · ${item.graphics_notes}` : ''}
              </p>
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Edit segment"
                  onClick={() => setEditingId(item._id)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Remove segment"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeletingItem(item)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        ),
      )}

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this segment?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.segment_name} — this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
