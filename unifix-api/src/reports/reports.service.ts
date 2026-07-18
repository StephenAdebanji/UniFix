import { Injectable } from '@nestjs/common';
import { RequestStatus, RoleName } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [statusCounts, categoryCounts, officers] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['categoryId'],
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { role: { name: RoleName.MAINTENANCE_OFFICER } },
        select: {
          id: true,
          name: true,
          department: true,
          currentlyAssigned: { select: { status: true } },
        },
      }),
    ]);

    const categories = await this.prisma.requestCategory.findMany();
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    const byStatus = Object.fromEntries(
      Object.values(RequestStatus).map((status) => [status, 0]),
    ) as Record<RequestStatus, number>;
    for (const row of statusCounts) {
      byStatus[row.status] = row._count._all;
    }

    const byCategory = Object.fromEntries(
      categories.map((c) => [c.name, 0]),
    ) as Record<string, number>;
    for (const row of categoryCounts) {
      const name = categoryNameById.get(row.categoryId);
      if (name) byCategory[name] = row._count._all;
    }

    const officerWorkload = officers.map((officer) => ({
      id: officer.id,
      name: officer.name,
      department: officer.department,
      assigned: officer.currentlyAssigned.length,
      resolved: officer.currentlyAssigned.filter(
        (r) => r.status === RequestStatus.RESOLVED,
      ).length,
    }));

    return { byStatus, byCategory, officerWorkload };
  }

  async exportCsv() {
    const { byStatus, byCategory, officerWorkload } = await this.summary();

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines: string[] = ['Section,Label,Value'];

    for (const [status, count] of Object.entries(byStatus)) {
      lines.push(`By Status,${escape(status)},${count}`);
    }
    for (const [category, count] of Object.entries(byCategory)) {
      lines.push(`By Category,${escape(category)},${count}`);
    }
    for (const officer of officerWorkload) {
      lines.push(
        `Officer Workload,${escape(officer.name)} (assigned),${officer.assigned}`,
      );
      lines.push(
        `Officer Workload,${escape(officer.name)} (resolved),${officer.resolved}`,
      );
    }

    return lines.join('\n');
  }
}
