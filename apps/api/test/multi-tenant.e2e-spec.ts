import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import {
  createTestCompany,
  createTestUser,
  signTokenFor,
} from './helpers/auth';

describe('Multi-tenant isolation (e2e) — transversal', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenA: string;
  let tokenB: string;
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

    const userA = await createTestUser(prisma, companyIdA);
    const userB = await createTestUser(prisma, companyIdB);
    userIdA = userA.userId;
    userIdB = userB.userId;

    tokenA = signTokenFor(app, {
      userId: userIdA,
      email: userA.email,
      role: 'FIELD_WORKER',
      companyId: companyIdA,
    });

    tokenB = signTokenFor(app, {
      userId: userIdB,
      email: userB.email,
      role: 'FIELD_WORKER',
      companyId: companyIdB,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Inventory — aislamiento entre tenants', () => {
    it('GET /api/inventory con JWT de empresa-B no devuelve registros de empresa-A', async () => {
      // Crear un registro en empresa-A
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ depositCode: 'DEP-A', productCode: 'PROD-A', quantity: 10 })
        .expect(201);

      // Empresa-B no debe verlo
      const res = await request(app.getHttpServer())
        .get('/api/inventory')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((r: any) => r.companyId);
      expect(ids.every((id: string) => id === companyIdB)).toBe(true);
    });

    it('POST /api/inventory con campo extra companyId en body → 400 antes de llegar al service', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          depositCode: 'DEP-A',
          productCode: 'PROD-A',
          quantity: 10,
          companyId: companyIdB,
        })
        .expect(400);

      expect(
        res.body.message.some(
          (m: string) =>
            m.includes('companyId') && m.includes('should not exist'),
        ),
      ).toBe(true);
    });
  });

  describe('Visits — aislamiento entre tenants', () => {
    it('GET /api/visits con JWT de empresa-A solo devuelve visitas de empresa-A', async () => {
      // Crear visita en empresa-A
      await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ clientCode: 'CLI-A', eventType: 'START' })
        .expect(201);

      // Empresa-A ve sus propias visitas
      const resA = await request(app.getHttpServer())
        .get('/api/visits')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(resA.body.length).toBeGreaterThan(0);
      expect(resA.body.every((v: any) => v.companyId === companyIdA)).toBe(
        true,
      );
    });

    it('GET /api/visits con JWT de empresa-B retorna array vacío si empresa-B no tiene visitas', async () => {
      // Solo empresa-A tiene visitas
      await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ clientCode: 'CLI-A', eventType: 'START' })
        .expect(201);

      const resB = await request(app.getHttpServer())
        .get('/api/visits')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(resB.body).toEqual([]);
    });
  });

  describe('Attendance — aislamiento entre tenants', () => {
    it('GET /api/attendance con JWT de empresa-B no devuelve eventos de empresa-A', async () => {
      // Crear evento en empresa-A
      await request(app.getHttpServer())
        .post('/api/attendance')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          employeeCode: 'EMP-001',
          eventCategory: 'PRESENCE',
          eventAction: 'IN',
        })
        .expect(201);

      const resB = await request(app.getHttpServer())
        .get('/api/attendance')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(Array.isArray(resB.body)).toBe(true);
      expect(resB.body.every((r: any) => r.companyId === companyIdB)).toBe(
        true,
      );
    });
  });
});
