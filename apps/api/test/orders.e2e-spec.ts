import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import { createTestCompany, createTestUser, signTokenFor } from './helpers/auth';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let companyId: string;
  let userId: string;

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
    companyId = company.companyId;
    userId = user.userId;
    token = signTokenFor(app, {
      userId,
      email: user.email,
      role: 'FIELD_WORKER',
      companyId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/orders', () => {
    it('sin clientCode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productCode: 'P01', quantity: 1 }] })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con items: [] → 400 (@ArrayMinSize(1))', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001', items: [] })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con item sin productCode → 400 (@ValidateNested)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001', items: [{ quantity: 2 }] })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con campo extra → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientCode: 'CLI001',
          items: [{ productCode: 'P01', quantity: 1 }],
          extraField: 'no_permitido',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('válido con 2 items → 201 con totalAmountGs calculado', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientCode: 'CLI001',
          items: [
            { productCode: 'P01', quantity: 2, unitPriceGs: 10000 },
            { productCode: 'P02', quantity: 1, unitPriceGs: 5000 },
          ],
        })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.clientCode).toBe('CLI001');
      expect(typeof res.body.totalAmountGs).toBe('number');
      expect(res.body.items).toHaveLength(2);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('con status inválido → 400', async () => {
      // Primero crear un pedido
      const created = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001', items: [{ productCode: 'P01', quantity: 1 }] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${created.body.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con status válido → 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001', items: [{ productCode: 'P01', quantity: 1 }] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${created.body.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(res.body.status).toBe('CONFIRMED');
    });
  });
});
