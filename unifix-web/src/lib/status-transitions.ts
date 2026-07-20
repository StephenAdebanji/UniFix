import type { RequestStatus } from './types';

// Mirrors unifix-api/src/service-requests/status-transitions.ts — the
// backend is the source of truth and enforces this atomically; this copy
// only drives which action buttons are shown, so keep it in sync manually.
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ['ASSIGNED'],
  ASSIGNED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
  REJECTED: [],
};

export function isTerminal(status: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export const STATUS_ACTION_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Submit',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accept',
  IN_PROGRESS: 'Mark in progress',
  RESOLVED: 'Resolve',
  REJECTED: 'Reject',
};
