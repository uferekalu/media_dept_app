import { cn } from '@/lib/utils';
import { SERVICE_STATUS_LABELS, SERVICE_STATUS_ORDER } from '@/lib/types/enums';
import type { ServiceStatus } from '@/lib/types/enums';

// Genuinely visual pipeline position, not just a colored text badge, per
// frontend/CLAUDE.md — a segmented bar (one segment per stage of the Service
// pipeline) plus the current stage's human-readable label, mirroring
// protocol_dept_app's status-stepper.tsx exactly (same pattern, this app's own
// 8-stage Service pipeline instead of Invitation's).
export function ServiceStatusStepper({ status }: { status: ServiceStatus }) {
  const currentIndex = SERVICE_STATUS_ORDER.indexOf(status);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" role="img" aria-label={`Status: ${SERVICE_STATUS_LABELS[status]}`}>
        {SERVICE_STATUS_ORDER.map((step, index) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= currentIndex ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-body-sm font-medium text-foreground">{SERVICE_STATUS_LABELS[status]}</p>
    </div>
  );
}
