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

describe('ValidationPipe (e2e) — transversal', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

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
    const company = await createTestCompany(prisma);
    const user = await createTestUser(prisma, company.companyId);
    token = signTokenFor(app, {
      userId: user.userId,
      email: user.email,
      role: 'FIELD_WORKER',
      companyId: company.companyId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Campo extra en endpoint autenticado → 400', () => {
    it('POST /api/inventory con campo extra appVersion → 400 con mensaje descriptivo', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depositCode: 'D01',
          productCode: 'P01',
          quantity: 5,
          appVersion: '1.0',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(
        res.body.message.some(
          (m: string) =>
            m.includes('appVersion') && m.includes('should not exist'),
        ),
      ).toBe(true);
      expect(res.body.error).toBe('Bad Request');
    });

    it('POST /api/inventory con companyId en body → 400 con "property companyId should not exist"', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depositCode: 'D01',
          productCode: 'P01',
          quantity: 5,
          companyId: 'fake-tenant',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(
        res.body.message.some(
          (m: string) =>
            m.includes('companyId') && m.includes('should not exist'),
        ),
      ).toBe(true);
    });

    it('POST /api/inventory con quantity como string no numérico → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depositCode: 'D01',
          productCode: 'P01',
          quantity: 'abc',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
      // Con enableImplicitConversion: false, 'abc' no es coercible a número
      const msgs: string[] = res.body.message;
      expect(
        msgs.some(
          (m) =>
            m.toLowerCase().includes('quantity') ||
            m.toLowerCase().includes('number'),
        ),
      ).toBe(true);
    });

    it('POST /api/orders sin items → 400 (@ArrayMinSize)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientCode: 'CLI001',
          items: [],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });
  });

  describe('Shape estándar del error 400', () => {
    it('el body de respuesta tiene statusCode, message (array) y error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depositCode: 'D01',
          productCode: 'P01',
          quantity: 5,
          unknownField: 'x',
        })
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('Sin autenticación → 401', () => {
    it('POST /api/inventory sin Authorization header → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory')
        .send({ depositCode: 'D01', productCode: 'P01', quantity: 5 })
        .expect(401);
    });
  });
});
