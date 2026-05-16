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
 * Nota: el DTO de CreateCourierDto requiere 'status' (enum CourierDeliveryStatus) e 'items' (array).
 * 'receiverName' es opcional en el DTO (campo: @IsOptional() @IsString() receiverName?: string).
 * El spec tasks decía "POST sin recipientName → 400" pero ese campo es opcional.
 * Se ajusta: el campo requerido real es 'status'.
 * 'items' también es requerido (@IsArray() @ValidateNested).
 */
describe('Courier (e2e)', () => {
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

  describe('POST /api/courier', () => {
    it('sin status → 400 (status es requerido)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ barcode: 'BC001' }] })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con status inválido (no enum CourierDeliveryStatus) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVALID_STATUS', items: [{ barcode: 'BC001' }] })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('con campo extra → 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'DELIVERED',
          items: [{ barcode: 'BC001' }],
          extraField: 'no_permitido',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con item sin barcode → 400 (@ValidateNested)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'DELIVERED', items: [{ noBarcode: 'x' }] })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('válido con status DELIVERED e items → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'DELIVERED',
          items: [{ barcode: 'BC001' }, { barcode: 'BC002' }],
        })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.status).toBe('DELIVERED');
    });

    it('válido con status NOT_DELIVERED e items: [] → 201 (items vacío permitido por el DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'NOT_DELIVERED', items: [] })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.status).toBe('NOT_DELIVERED');
    });
  });

  describe('GET /api/courier', () => {
    it('devuelve solo entregas del tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'DELIVERED', items: [{ barcode: 'BC001' }] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/courier')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((r: any) => r.companyId === companyId)).toBe(true);
    });
  });
});
