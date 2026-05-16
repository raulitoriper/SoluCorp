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

describe('Visits (e2e)', () => {
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

  describe('POST /api/visits', () => {
    it('sin clientCode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'START' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('sin eventType → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con eventType inválido (no enum VisitEventType) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001', eventType: 'INVALID_EVENT' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con companyId en body → 400 (cobertura W01 a nivel transporte)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientCode: 'CLI001',
          eventType: 'START',
          companyId: 'tenant-malicious',
        })
        .expect(400);

      expect(
        res.body.message.some(
          (m: string) =>
            m.includes('companyId') && m.includes('should not exist'),
        ),
      ).toBe(true);
    });

    it('válido → 201 con companyId del JWT, no del body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ clientCode: 'CLI001', eventType: 'START' })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.clientCode).toBe('CLI001');
      expect(res.body.eventType).toBe('START');
    });
  });
});
