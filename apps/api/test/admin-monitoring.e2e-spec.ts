import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import {
  createTestCompany,
  createTestUser,
  createSuperAdmin,
  signTokenFor,
} from './helpers/auth';

describe('Admin Monitoring — GET /api/admin/gps/last-positions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let companyAdminToken: string;
  let fieldWorkerToken: string;

  let companyIdA: string;
  let companyIdB: string;
  let userIdA: string;
  let userIdB: string;

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
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await truncateAll(prisma);

    const companyA = await createTestCompany(prisma, { name: 'Empresa A' });
    const companyB = await createTestCompany(prisma, { name: 'Empresa B' });
    companyIdA = companyA.companyId;
    companyIdB = companyB.companyId;

    const userA = await createTestUser(prisma, companyIdA, 'FIELD_WORKER', {
      email: `worker-a-${Date.now()}@test.local`,
    });
    const userB = await createTestUser(prisma, companyIdB, 'FIELD_WORKER', {
      email: `worker-b-${Date.now()}@test.local`,
    });
    userIdA = userA.userId;
    userIdB = userB.userId;

    await prisma.user.update({
      where: { id: userIdA },
      data: { firstName: 'Juan', lastName: 'Perez' },
    });
    await prisma.user.update({
      where: { id: userIdB },
      data: { firstName: 'Maria', lastName: 'Lopez' },
    });

    const companyAdmin = await createTestUser(
      prisma,
      companyIdA,
      'COMPANY_ADMIN',
      { email: `ca-${Date.now()}@test.local` },
    );

    const superAdmin = await createSuperAdmin(prisma);

    superAdminToken = signTokenFor(app, {
      userId: superAdmin.userId,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
      companyId: null,
    });

    companyAdminToken = signTokenFor(app, {
      userId: companyAdmin.userId,
      email: companyAdmin.email,
      role: 'COMPANY_ADMIN',
      companyId: companyIdA,
    });

    fieldWorkerToken = signTokenFor(app, {
      userId: userIdA,
      email: userA.email,
      role: 'FIELD_WORKER',
      companyId: companyIdA,
    });

    await prisma.gpsLocation.createMany({
      data: [
        {
          companyId: companyIdA,
          userId: userIdA,
          latitude: -25.0,
          longitude: -57.0,
          recordedAt: new Date('2026-05-29T10:00:00Z'),
        },
        {
          companyId: companyIdA,
          userId: userIdA,
          latitude: -25.3,
          longitude: -57.5,
          accuracy: 5,
          batteryLevel: 80,
          recordedAt: new Date('2026-05-29T11:00:00Z'),
        },
        {
          companyId: companyIdB,
          userId: userIdB,
          latitude: -27.0,
          longitude: -55.0,
          recordedAt: new Date('2026-05-29T09:00:00Z'),
        },
        {
          companyId: companyIdB,
          userId: userIdB,
          latitude: -27.3,
          longitude: -55.8,
          accuracy: 10,
          batteryLevel: 65,
          recordedAt: new Date('2026-05-29T12:00:00Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. SUPER_ADMIN sin companyId → 200, devuelve posiciones cross-tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    const userIds = res.body.map((r: any) => r.userId).sort();
    expect(userIds).toEqual([userIdA, userIdB].sort());
  });

  it('2. SUPER_ADMIN con ?companyId=A → 200, solo posiciones de A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .query({ companyId: companyIdA })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0].userId).toBe(userIdA);
    expect(res.body[0].latitude).toBe(-25.3);
    expect(res.body[0].longitude).toBe(-57.5);
  });

  it('3. COMPANY_ADMIN autenticado → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .expect(403);
  });

  it('4. FIELD_WORKER autenticado → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .set('Authorization', `Bearer ${fieldWorkerToken}`)
      .expect(403);
  });

  it('5. Sin token → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .expect(401);
  });

  it('6. Shape de respuesta incluye userName "FirstName LastName"', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/gps/last-positions')
      .query({ companyId: companyIdA })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body[0]).toMatchObject({
      userId: userIdA,
      latitude: -25.3,
      longitude: -57.5,
      accuracy: 5,
      batteryLevel: 80,
      userName: 'Juan Perez',
    });
    expect(res.body[0].recordedAt).toBeDefined();
  });
});
