import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import { createTestCompany, createTestUser, signTokenFor } from './helpers/auth';

/**
 * Nota: el DTO de CreateMedicalVisitDto no tiene campo clientCode.
 * El único campo requerido (sin @IsOptional) es eventType.
 * El spec tasks decía "POST sin clientCode → 400" pero ese campo no existe en el DTO.
 * Se ajusta a la realidad del DTO: eventType es el único campo obligatorio.
 */
describe('Medical Visits (e2e)', () => {
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

  describe('POST /api/medical-visits', () => {
    it('sin eventType → 400 (único campo requerido del DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ clinicCode: 'CLINIC01' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con eventType inválido (no enum MedicalVisitEventType) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'INVALID_EVENT' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con campo extra → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'CLINIC_START', extraField: 'no_permitido' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('válido con eventType: CLINIC_START → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'CLINIC_START' })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.eventType).toBe('CLINIC_START');
    });

    it('válido con products → 201 con productos persistidos', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'CLINIC_START',
          products: [{ productCode: 'MED01', quantity: 5 }],
        })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].productCode).toBe('MED01');
    });

    it('con product sin productCode → 400 (@ValidateNested)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventType: 'CLINIC_START',
          products: [{ quantity: 5 }],
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con nextVisitDate como ISO date string → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'CLINIC_START', nextVisitDate: '2026-12-31' })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
    });
  });

  describe('GET /api/medical-visits', () => {
    it('devuelve solo registros del tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventType: 'CLINIC_START' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/medical-visits')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((r: any) => r.companyId === companyId)).toBe(true);
    });
  });
});
