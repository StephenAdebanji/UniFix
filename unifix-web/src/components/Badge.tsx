import type { RequestPriority, RequestStatus } from '@/lib/types';

const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

const PRIORITY_STYLES: Record<RequestPriority, string> = {
  LOW: 'bg-white text-neutral-600 border-neutral-300',
  MEDIUM: 'bg-white text-blue-700 border-blue-300',
  HIGH: 'bg-white text-red-600 border-red-300',
};

function BaseBadge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium tracking-wide uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <BaseBadge className={STATUS_STYLES[status]}>
      {STATUS_LABEL[status]}
    </BaseBadge>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return (
    <BaseBadge className={PRIORITY_STYLES[priority]}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()} Priority
    </BaseBadge>
  );
}
