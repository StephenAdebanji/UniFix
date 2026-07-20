import { RequestStatus } from '../../generated/prisma/enums';

export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: [RequestStatus.ASSIGNED],
  ASSIGNED: [RequestStatus.ACCEPTED, RequestStatus.REJECTED],
  ACCEPTED: [RequestStatus.IN_PROGRESS, RequestStatus.RESOLVED],
  IN_PROGRESS: [RequestStatus.RESOLVED],
  RESOLVED: [],
  REJECTED: [],
};

export function isTerminal(status: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
