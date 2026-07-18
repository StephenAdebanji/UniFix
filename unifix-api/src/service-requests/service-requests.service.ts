import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  RequestStatus,
  RoleName,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { QueryServiceRequestsDto } from './dto/query-service-requests.dto';
import { AssignRequestDto } from './dto/assign-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Submitted request',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'Marked in progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

const requestSummaryInclude = {
  category: true,
  submittedBy: { select: { id: true, name: true } },
  currentAssignee: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(
    request: Prisma.ServiceRequestGetPayload<{
      include: typeof requestSummaryInclude;
    }>,
  ) {
    return {
      id: request.id,
      code: request.code,
      title: request.title,
      description: request.description,
      location: request.location,
      status: request.status,
      priority: request.priority,
      evidenceFileUrl: request.evidenceFileUrl,
      category: request.category.name,
      submittedBy: request.submittedBy,
      assignedTo: request.currentAssignee,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private scopeForUser(user: AuthenticatedUser) {
    if (user.role === RoleName.STUDENT_STAFF) {
      return { submittedById: user.userId };
    }
    if (user.role === RoleName.MAINTENANCE_OFFICER) {
      return { currentAssigneeId: user.userId };
    }
    return {};
  }

  private async assertCanView(user: AuthenticatedUser, requestId: number) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Service request not found');
    }
    if (
      user.role === RoleName.STUDENT_STAFF &&
      request.submittedById !== user.userId
    ) {
      throw new ForbiddenException('You do not have access to this request');
    }
    if (
      user.role === RoleName.MAINTENANCE_OFFICER &&
      request.currentAssigneeId !== user.userId
    ) {
      throw new ForbiddenException('You do not have access to this request');
    }
    return request;
  }

  async create(user: AuthenticatedUser, dto: CreateServiceRequestDto) {
    const category = await this.prisma.requestCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Unknown category');
    }

    const placeholderCode = `PENDING-${randomUUID()}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: {
          code: placeholderCode,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          priority: dto.priority,
          evidenceFileUrl: dto.evidenceFileUrl,
          categoryId: dto.categoryId,
          submittedById: user.userId,
        },
      });

      const finalCode = `REQ-${String(request.id).padStart(4, '0')}`;
      const withCode = await tx.serviceRequest.update({
        where: { id: request.id },
        data: { code: finalCode },
        include: requestSummaryInclude,
      });

      await tx.statusUpdate.create({
        data: {
          requestId: request.id,
          updatedById: user.userId,
          oldStatus: null,
          newStatus: RequestStatus.PENDING,
        },
      });

      return withCode;
    });

    return this.toSummary(created);
  }

  async findAll(user: AuthenticatedUser, query: QueryServiceRequestsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ...this.scopeForUser(user),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { title: { contains: query.search, mode: 'insensitive' as const } },
              {
                location: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceRequest.findMany({
        where,
        include: requestSummaryInclude,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toSummary(item)),
      total,
      page,
      limit,
    };
  }

  async findOne(user: AuthenticatedUser, id: number) {
    await this.assertCanView(user, id);

    const request = await this.prisma.serviceRequest.findUniqueOrThrow({
      where: { id },
      include: requestSummaryInclude,
    });

    const [statusUpdates, assignments] = await Promise.all([
      this.prisma.statusUpdate.findMany({
        where: { requestId: id },
        include: { updatedBy: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.assignment.findMany({
        where: { requestId: id },
        include: {
          assignedOfficer: { select: { name: true } },
          assignedBy: { select: { name: true } },
        },
        orderBy: { assignedAt: 'asc' },
      }),
    ]);

    const activity = [
      ...statusUpdates
        .filter((update) => update.newStatus !== RequestStatus.ASSIGNED)
        .map((update) => ({
          type: 'STATUS_CHANGE' as const,
          label: STATUS_LABELS[update.newStatus],
          note: update.note,
          by: update.updatedBy.name,
          at: update.createdAt,
        })),
      ...assignments.map((assignment) => ({
        type: 'ASSIGNED' as const,
        label: `Assigned to ${assignment.assignedOfficer.name}`,
        note: null as string | null,
        by: assignment.assignedBy.name,
        at: assignment.assignedAt,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    return { ...this.toSummary(request), activity };
  }

  async assign(user: AuthenticatedUser, id: number, dto: AssignRequestDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    const officer = await this.prisma.user.findUnique({
      where: { id: dto.officerId },
      include: { role: true },
    });
    if (!officer || officer.role.name !== RoleName.MAINTENANCE_OFFICER) {
      throw new BadRequestException('Target user is not a maintenance officer');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.serviceRequest.update({
        where: { id },
        data: {
          currentAssigneeId: officer.id,
          status: RequestStatus.ASSIGNED,
        },
        include: requestSummaryInclude,
      });

      await tx.assignment.create({
        data: {
          requestId: id,
          assignedOfficerId: officer.id,
          assignedById: user.userId,
        },
      });

      await tx.statusUpdate.create({
        data: {
          requestId: id,
          updatedById: user.userId,
          oldStatus: request.status,
          newStatus: RequestStatus.ASSIGNED,
        },
      });

      return result;
    });

    return this.toSummary(updated);
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateStatusDto,
  ) {
    const request = await this.assertCanView(user, id);

    if (
      user.role === RoleName.MAINTENANCE_OFFICER &&
      request.currentAssigneeId !== user.userId
    ) {
      throw new ForbiddenException('This request is not assigned to you');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.serviceRequest.update({
        where: { id },
        data: { status: dto.status },
        include: requestSummaryInclude,
      });

      await tx.statusUpdate.create({
        data: {
          requestId: id,
          updatedById: user.userId,
          oldStatus: request.status,
          newStatus: dto.status,
          note: dto.note,
        },
      });

      return result;
    });

    return this.toSummary(updated);
  }

  async exportCsv(user: AuthenticatedUser) {
    const items = await this.prisma.serviceRequest.findMany({
      where: this.scopeForUser(user),
      include: requestSummaryInclude,
      orderBy: { id: 'asc' },
    });

    const header = [
      'Code',
      'Title',
      'Category',
      'Location',
      'Priority',
      'Status',
      'Submitted By',
      'Assigned To',
      'Created At',
    ];

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = items.map((item) =>
      [
        item.code,
        item.title,
        item.category.name,
        item.location,
        item.priority,
        item.status,
        item.submittedBy.name,
        item.currentAssignee?.name ?? '',
        item.createdAt.toISOString(),
      ]
        .map((value) => escape(String(value)))
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }
}
