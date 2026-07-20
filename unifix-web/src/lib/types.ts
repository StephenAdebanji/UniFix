export type RoleName = 'STUDENT_STAFF' | 'MAINTENANCE_OFFICER' | 'ADMINISTRATOR';

export type RequestStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  department: string | null;
  role: RoleName;
}

export interface Category {
  id: number;
  name: string;
}

export interface RequestSummary {
  id: number;
  code: string;
  title: string;
  description: string;
  location: string;
  status: RequestStatus;
  priority: RequestPriority;
  evidenceFileUrl: string | null;
  category: string;
  submittedBy: { id: number; name: string };
  assignedTo: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  type: 'STATUS_CHANGE' | 'ASSIGNED';
  label: string;
  note: string | null;
  by: string;
  at: string;
}

export interface RequestDetail extends RequestSummary {
  activity: ActivityEvent[];
}

export interface PaginatedRequests {
  items: RequestSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportsSummary {
  byStatus: Record<RequestStatus, number>;
  byCategory: Record<string, number>;
  officerWorkload: {
    id: number;
    name: string;
    department: string | null;
    assigned: number;
    resolved: number;
  }[];
}
