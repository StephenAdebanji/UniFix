import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RoleName } from '../generated/prisma/enums';

describe('UniFix API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const emails = {
    student: `e2e_student_${runId}@uni.edu`,
    officer: `e2e_officer_${runId}@uni.edu`,
    admin: `e2e_admin_${runId}@uni.edu`,
  };
  const createdUserIds: number[] = [];
  const createdRequestIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdRequestIds.length) {
      await prisma.statusUpdate.deleteMany({
        where: { requestId: { in: createdRequestIds } },
      });
      await prisma.assignment.deleteMany({
        where: { requestId: { in: createdRequestIds } },
      });
      await prisma.serviceRequest.deleteMany({
        where: { id: { in: createdRequestIds } },
      });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  it('/ (GET) returns a 200', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  describe('auth', () => {
    it('rejects registration with an invalid email (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Bad', email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('registers a new Student/Staff account', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Student',
          email: emails.student,
          password: 'password123',
        })
        .expect(201);

      expect(res.body.user.role).toBe(RoleName.STUDENT_STAFF);
      expect(res.body.accessToken).toBeDefined();
      createdUserIds.push(res.body.user.id);
    });

    it('rejects duplicate registration (409)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Dup',
          email: emails.student,
          password: 'password123',
        })
        .expect(409);
    });

    it('rejects login with wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emails.student, password: 'wrong-password' })
        .expect(401);
    });

    it('logs in with correct credentials (200)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emails.student, password: 'password123' })
        .expect(200);
    });

    it('rejects /auth/me without a token (401)', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('RBAC and service request lifecycle', () => {
    let studentToken: string;
    let officerToken: string;
    let adminToken: string;
    let officerId: number;
    let categoryId: number;
    let requestId: number;

    beforeAll(async () => {
      const officerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Officer',
          email: emails.officer,
          password: 'password123',
        });
      const adminRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Admin',
          email: emails.admin,
          password: 'password123',
        });
      createdUserIds.push(officerRes.body.user.id, adminRes.body.user.id);
      officerId = officerRes.body.user.id;

      const [officerRole, adminRole] = await Promise.all([
        prisma.role.findUniqueOrThrow({
          where: { name: RoleName.MAINTENANCE_OFFICER },
        }),
        prisma.role.findUniqueOrThrow({
          where: { name: RoleName.ADMINISTRATOR },
        }),
      ]);
      await prisma.user.update({
        where: { id: officerId },
        data: { roleId: officerRole.id },
      });
      await prisma.user.update({
        where: { id: adminRes.body.user.id },
        data: { roleId: adminRole.id },
      });

      const studentLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emails.student, password: 'password123' });
      studentToken = studentLogin.body.accessToken;

      const officerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emails.officer, password: 'password123' });
      officerToken = officerLogin.body.accessToken;

      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emails.admin, password: 'password123' });
      adminToken = adminLogin.body.accessToken;

      const category = await prisma.requestCategory.findFirstOrThrow();
      categoryId = category.id;
    });

    it('blocks a Student/Staff user from /users (403)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('allows an Administrator to list users (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('lets a Student/Staff user create a service request', async () => {
      const res = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'E2E broken chair',
          categoryId,
          location: 'E2E Test Room',
          description: 'Chair leg is broken and unsafe to sit on.',
        })
        .expect(201);

      expect(res.body.code).toMatch(/^REQ-\d{4}$/);
      expect(res.body.status).toBe('PENDING');
      requestId = res.body.id;
      createdRequestIds.push(requestId);
    });

    it('rejects an invalid create-request payload (400)', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'x' })
        .expect(400);
    });

    it('blocks a non-owner Student/Staff view of the request (403 via scoping -> 404-equivalent)', async () => {
      // A second student cannot see a request they don't own; findOne enforces this via ForbiddenException.
      const otherLogin = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Other Student',
          email: `e2e_other_${runId}@uni.edu`,
          password: 'password123',
        });
      createdUserIds.push(otherLogin.body.user.id);

      await request(app.getHttpServer())
        .get(`/requests/${requestId}`)
        .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
        .expect(403);
    });

    it('blocks a Student/Staff user from assigning a request (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/requests/${requestId}/assign`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ officerId })
        .expect(403);
    });

    it('lets an Administrator assign the request to an officer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ officerId })
        .expect(200);

      expect(res.body.status).toBe('ASSIGNED');
      expect(res.body.assignedTo.id).toBe(officerId);
    });

    it('lets the assigned officer update the status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'RESOLVED', note: 'Fixed the chair' })
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
    });

    it('returns a chronological activity log for the request', async () => {
      const res = await request(app.getHttpServer())
        .get(`/requests/${requestId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const labels = res.body.activity.map((event: { label: string }) =>
        event.label,
      );
      expect(labels).toEqual([
        'Submitted request',
        'Assigned to E2E Officer',
        'Resolved',
      ]);
    });
  });
});
