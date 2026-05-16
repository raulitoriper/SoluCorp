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

/**
 * Módulo guard: el controller usa @Controller('guard-shifts').
 * El path correcto es /api/guard-shifts.
 * El campo requerido es guardCode (no eventType — ese es opcional en el DTO).
 */
describe('Guard Shifts (e2e)', () => {
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

  describe('POST /api/guard-shifts', () => {
    it('sin guardCode → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'START' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con eventType inválido (no enum GuardShiftEventType: SHIFT_START|SHIFT_END|MARK) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .send({ guardCode: 'G001', eventType: 'INVALID_TYPE' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con companyId en body → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .send({ guardCode: 'G001', companyId: 'otro-tenant' })
        .expect(400);

      expect(
        res.body.message.some(
          (m: string) =>
            m.includes('companyId') && m.includes('should not exist'),
        ),
      ).toBe(true);
    });

    it('válido → 201 con companyId del JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .send({ guardCode: 'G001', eventType: 'SHIFT_START' })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.guardCode).toBe('G001');
    });

    it('válido sin eventType → 201 (eventType es opcional en el DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .send({ guardCode: 'G001' })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
    });
  });

  describe('GET /api/guard-shifts', () => {
    it('devuelve solo turnos del tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .send({ guardCode: 'G001', eventType: 'SHIFT_START' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/guard-shifts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].companyId).toBe(companyId);
    });
  });
});
