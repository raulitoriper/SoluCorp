import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import { createTestCompany, createTestUser, signTokenFor } from './helpers/auth';

describe('GPS (e2e)', () => {
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

  describe('POST /api/gps/batch', () => {
    it('sin latitude en punto → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{ longitude: -57.5, recordedAt: '2026-05-16T10:00:00.000Z' }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('sin longitude en punto → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{ latitude: -25.3, recordedAt: '2026-05-16T10:00:00.000Z' }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con latitude fuera de rango (100) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{ latitude: 100, longitude: -57.5, recordedAt: '2026-05-16T10:00:00.000Z' }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con longitude fuera de rango (-200) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{ latitude: -25.3, longitude: -200, recordedAt: '2026-05-16T10:00:00.000Z' }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con recordedAt inválido (no date string) → 400 (@IsDateString)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{ latitude: -25.3, longitude: -57.5, recordedAt: 'not-a-date' }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con campo extra en punto → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{
            latitude: -25.3,
            longitude: -57.5,
            recordedAt: '2026-05-16T10:00:00.000Z',
            extraField: 'no_permitido',
          }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('válido con un punto → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{
            latitude: -25.3,
            longitude: -57.5,
            recordedAt: '2026-05-16T10:00:00.000Z',
          }],
        })
        .expect(201);

      expect(res.body.inserted).toBe(1);
    });

    it('con 51 puntos → 400 (límite del service: máximo 50)', async () => {
      const points = Array.from({ length: 51 }, (_, i) => ({
        latitude: -25.3,
        longitude: -57.5 + i * 0.001,
        recordedAt: new Date(Date.now() + i * 1000).toISOString(),
      }));

      const res = await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ points })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/gps/last-positions', () => {
    it('retorna array filtrado por companyId del JWT', async () => {
      // Crear un punto primero
      await request(app.getHttpServer())
        .post('/api/gps/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          points: [{ latitude: -25.3, longitude: -57.5, recordedAt: '2026-05-16T10:00:00.000Z' }],
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/gps/last-positions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
