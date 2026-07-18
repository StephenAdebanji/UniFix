import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RoleName } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    role: { findUniqueOrThrow: jest.Mock };
  };

  const studentRole = { id: 1, name: RoleName.STUDENT_STAFF };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findUniqueOrThrow: jest.fn().mockResolvedValue(studentRole) },
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => `secret-${key}`),
      get: jest.fn((_key: string, fallback: string) => fallback),
    } as unknown as ConfigService;

    service = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService(),
      configService,
    );
  });

  describe('register', () => {
    it('throws ConflictException when the email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@uni.edu' });

      await expect(
        service.register({
          name: 'A',
          email: 'a@uni.edu',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a Student/Staff user and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 5,
        name: 'Yaw',
        email: 'yaw@uni.edu',
        department: null,
        role: studentRole,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.register({
        name: 'Yaw',
        email: 'yaw@uni.edu',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roleId: studentRole.id }),
        }),
      );
      expect(result.user).toEqual({
        id: 5,
        name: 'Yaw',
        email: 'yaw@uni.edu',
        department: null,
        role: RoleName.STUDENT_STAFF,
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@uni.edu', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Yaw',
        email: 'yaw@uni.edu',
        department: null,
        passwordHash,
        role: studentRole,
      });

      await expect(
        service.login({ email: 'yaw@uni.edu', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns tokens for correct credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Yaw',
        email: 'yaw@uni.edu',
        department: null,
        passwordHash,
        role: studentRole,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'yaw@uni.edu',
        password: 'correct-password',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('rejects a token that does not belong to any user session', async () => {
      const jwtService = new JwtService();
      const token = await jwtService.signAsync(
        { sub: 1, email: 'yaw@uni.edu', role: RoleName.STUDENT_STAFF },
        { secret: 'secret-JWT_REFRESH_SECRET' },
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        hashedRefreshToken: null,
        role: studentRole,
      });

      await expect(service.refresh(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a garbage/invalid token', async () => {
      await expect(service.refresh('not-a-real-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      prisma.user.update.mockResolvedValue({});
      await service.logout(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { hashedRefreshToken: null },
      });
    });
  });
});
