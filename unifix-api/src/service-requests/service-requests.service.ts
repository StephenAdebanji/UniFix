import {
  BadRequestException,
  ConflictException,
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
import { ALLOWED_TRANSITIONS, isTerminal } from './status-transitions';

// Neon's serverless compute can cold-start mid-transaction; the Prisma
// default (5s) interactive-transaction timeout is too tight for that.
const TRANSACTION_OPTIONS = { timeout: 15000 };

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Submitted request',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
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
    }, TRANSACTION_OPTIONS);

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

  private async buildActivity(id: number) {
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

    return [
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
  }

  async findOne(user: AuthenticatedUser, id: number) {
    await this.assertCanView(user, id);

    const request = await this.prisma.serviceRequest.findUniqueOrThrow({
      where: { id },
      include: requestSummaryInclude,
    });

    const activity = await this.buildActivity(id);

    return { ...this.toSummary(request), activity };
  }

  async assign(user: AuthenticatedUser, id: number, dto: AssignRequestDto) {
    const officer = await this.prisma.user.findUnique({
      where: { id: dto.officerId },
      include: { role: true },
    });
    if (!officer || officer.role.name !== RoleName.MAINTENANCE_OFFICER) {
      throw new BadRequestException('Target user is not a maintenance officer');
    }

    await this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findUniqueOrThrow({
        where: { id },
      });

      if (isTerminal(request.status)) {
        throw new ForbiddenException(
          'This request is closed and cannot be modified',
        );
      }
      if (!ALLOWED_TRANSITIONS[request.status].includes(RequestStatus.ASSIGNED)) {
        throw new BadRequestException(
          'This request cannot be assigned in its current status',
        );
      }

      // Only succeeds if the row is still in the status we just read — a
      // concurrent assign/status-change between our read and this write
      // makes count 0, so we throw instead of silently double-logging.
      const result = await tx.serviceRequest.updateMany({
        where: { id, status: request.status },
        data: {
          currentAssigneeId: officer.id,
          status: RequestStatus.ASSIGNED,
        },
      });
      if (result.count === 0) {
        throw new ConflictException(
          'Request status was changed by another action, please refresh',
        );
      }

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
    }, TRANSACTION_OPTIONS);

    const [updated, activity] = await Promise.all([
      this.prisma.serviceRequest.findUniqueOrThrow({
        where: { id },
        include: requestSummaryInclude,
      }),
      this.buildActivity(id),
    ]);
    return { ...this.toSummary(updated), activity };
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateStatusDto,
  ) {
    if (
      dto.status === RequestStatus.REJECTED &&
      !dto.note?.trim()
    ) {
      throw new BadRequestException('A reason is required to reject a request');
    }

    await this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findUnique({ where: { id } });
      if (!request) {
        throw new NotFoundException('Service request not found');
      }
      if (
        user.role === RoleName.MAINTENANCE_OFFICER &&
        request.currentAssigneeId !== user.userId
      ) {
        throw new ForbiddenException('This request is not assigned to you');
      }

      if (isTerminal(request.status)) {
        throw new ForbiddenException(
          'This request is closed and cannot be modified',
        );
      }
      if (request.status === dto.status) {
        throw new BadRequestException('Request is already in this status');
      }
      if (!ALLOWED_TRANSITIONS[request.status].includes(dto.status)) {
        throw new BadRequestException('Invalid status transition');
      }

      // Only succeeds if the row is still in the status we just read — a
      // duplicate click that already slipped a status change through makes
      // count 0 here, so we throw instead of silently double-logging.
      const result = await tx.serviceRequest.updateMany({
        where: { id, status: request.status },
        data: { status: dto.status },
      });
      if (result.count === 0) {
        throw new ConflictException(
          'Request status was changed by another action, please refresh',
        );
      }

      await tx.statusUpdate.create({
        data: {
          requestId: id,
          updatedById: user.userId,
          oldStatus: request.status,
          newStatus: dto.status,
          note: dto.note,
        },
      });
    }, TRANSACTION_OPTIONS);

    const [updated, activity] = await Promise.all([
      this.prisma.serviceRequest.findUniqueOrThrow({
        where: { id },
        include: requestSummaryInclude,
      }),
      this.buildActivity(id),
    ]);
    return { ...this.toSummary(updated), activity };
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
