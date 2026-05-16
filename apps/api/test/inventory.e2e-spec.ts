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

describe('Inventory (e2e)', () => {
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

  describe('POST /api/inventory', () => {
    it('sin depositCode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({ productCode: 'P01', quantity: 5 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('sin productCode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({ depositCode: 'D01', quantity: 5 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('sin quantity → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({ depositCode: 'D01', productCode: 'P01' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con companyId en body → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depositCode: 'D01',
          productCode: 'P01',
          quantity: 5,
          companyId: 'otro-tenant',
        })
        .expect(400);

      expect(
        res.body.message.some(
          (m: string) =>
            m.includes('companyId') && m.includes('should not exist'),
        ),
      ).toBe(true);
    });

    it('válido → 201 con companyId del JWT (no del body)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({ depositCode: 'D01', productCode: 'P01', quantity: 10 })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.depositCode).toBe('D01');
      expect(res.body.productCode).toBe('P01');
      // Prisma Decimal se serializa como string en JSON
      expect(Number(res.body.quantity)).toBe(10);
    });

    it('con latitude fuera de rango (91) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({
          depositCode: 'D01',
          productCode: 'P01',
          quantity: 5,
          latitude: 91,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/inventory', () => {
    it('devuelve solo registros del tenant', async () => {
      // Crear un registro
      await request(app.getHttpServer())
        .post('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .send({ depositCode: 'D01', productCode: 'P01', quantity: 5 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/inventory')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].companyId).toBe(companyId);
    });
  });
});
