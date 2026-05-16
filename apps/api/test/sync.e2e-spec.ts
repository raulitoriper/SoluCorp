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

describe('Sync (e2e)', () => {
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

  describe('POST /api/sync/batch', () => {
    it('con item sin idempotencyKey → 400 (NO 500)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ entityType: 'visit', payload: { clientCode: 'CLI001' } }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con idempotencyKey vacío ("") → 400 (@IsNotEmpty)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              entityType: 'visit',
              idempotencyKey: '',
              payload: { clientCode: 'CLI001' },
            },
          ],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con item válido nuevo → 201 con estado SYNCED', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              entityType: 'visit',
              idempotencyKey: 'idem-key-001',
              payload: { clientCode: 'CLI001', eventType: 'START' },
            },
          ],
        })
        .expect(201);

      expect(res.body.processed).toBe(1);
      expect(res.body.results[0].status).toBe('SYNCED');
      expect(res.body.results[0].idempotencyKey).toBe('idem-key-001');
    });

    it('con idempotencyKey duplicado → 201 con estado ALREADY_SYNCED', async () => {
      const payload = {
        items: [
          {
            entityType: 'visit',
            idempotencyKey: 'idem-key-duplicate',
            payload: { clientCode: 'CLI001' },
          },
        ],
      };

      // Primera vez
      await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      // Segunda vez — debe retornar ALREADY_SYNCED
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      expect(res.body.results[0].status).toBe('ALREADY_SYNCED');
    });

    it('con payload objeto libre → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              entityType: 'custom_entity',
              idempotencyKey: 'idem-key-free',
              payload: {
                nested: { data: [1, 2, 3], flag: true },
                freeField: 'value',
              },
            },
          ],
        })
        .expect(201);

      expect(res.body.results[0].status).toBe('SYNCED');
    });

    it('con payload string (no objeto) → 400 (@IsObject)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              entityType: 'visit',
              idempotencyKey: 'idem-key-string',
              payload: 'esto-no-es-objeto',
            },
          ],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('sin items → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });
});
