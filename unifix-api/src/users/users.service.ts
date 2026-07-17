import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUser(user: {
    id: number;
    name: string;
    email: string;
    department: string | null;
    role: { name: RoleName };
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role.name,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { id: 'asc' },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async updateRole(id: number, role: RoleName) {
    const targetRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: role },
    });

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { roleId: targetRole.id },
        include: { role: true },
      });
      return this.toPublicUser(user);
    } catch {
      throw new NotFoundException('User not found');
    }
  }
}
