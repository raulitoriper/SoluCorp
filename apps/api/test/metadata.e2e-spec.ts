import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/common/prisma/prisma.service';
import { truncateAll } from './helpers/db';
import { createTestCompany, createTestUser, signTokenFor } from './helpers/auth';

/**
 * Módulo metadata:
 * - El controller usa @Controller('metadata') sin ModuleGuard (solo JwtAuthGuard).
 * - NO existe endpoint POST /api/metadata/types ni POST /api/metadata/items.
 * - El endpoint real para crear items es: POST /api/metadata/:typeCode/items
 * - El CreateMetadataItemDto requiere: code (string) y value (string). NO tiene 'name' ni 'typeId'.
 * - El tipo de metadata se crea implícitamente si no existe, o se busca por (companyId, code).
 * - Para que el createItem funcione, el metadataType debe existir en DB con ese typeCode.
 * - El spec tasks decía "POST type sin name → 400" y "POST item sin typeId → 400"
 *   pero esos campos no existen en la API real. Se ajustan los tests a la realidad.
 */
describe('Metadata (e2e)', () => {
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

  describe('POST /api/metadata/:typeCode/items', () => {
    it('sin code → 400', async () => {
      // Crear un tipo primero
      await prisma.metadataType.create({
        data: { companyId, code: 'TIPO01', name: 'Tipo 1' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/metadata/TIPO01/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 'Valor 1' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('sin value → 400', async () => {
      await prisma.metadataType.create({
        data: { companyId, code: 'TIPO02', name: 'Tipo 2' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/metadata/TIPO02/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'ITEM01' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con campo extra → 400 (forbidNonWhitelisted)', async () => {
      await prisma.metadataType.create({
        data: { companyId, code: 'TIPO03', name: 'Tipo 3' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/metadata/TIPO03/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'ITEM01', value: 'Valor 1', extraField: 'no_permitido' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('válido con typeCode existente → 201', async () => {
      await prisma.metadataType.create({
        data: { companyId, code: 'TIPO04', name: 'Tipo 4' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/metadata/TIPO04/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'ITEM01', value: 'Valor del item' })
        .expect(201);

      expect(res.body.companyId).toBe(companyId);
      expect(res.body.code).toBe('ITEM01');
      expect(res.body.value).toBe('Valor del item');
    });

    it('con typeCode inexistente → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/metadata/TIPO_INEXISTENTE/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'ITEM01', value: 'Valor 1' })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/metadata/items/:id', () => {
    it('con value vacío → 400 (@IsNotEmpty)', async () => {
      // Crear tipo e item
      const tipo = await prisma.metadataType.create({
        data: { companyId, code: 'TIPO05', name: 'Tipo 5' },
      });
      const item = await prisma.metadataItem.create({
        data: { companyId, metadataTypeId: tipo.id, code: 'ITEM01', value: 'Valor original' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/metadata/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ value: '' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('con body vacío → 400', async () => {
      const tipo = await prisma.metadataType.create({
        data: { companyId, code: 'TIPO06', name: 'Tipo 6' },
      });
      const item = await prisma.metadataItem.create({
        data: { companyId, metadataTypeId: tipo.id, code: 'ITEM02', value: 'Valor original' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/metadata/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/metadata/types', () => {
    it('devuelve lista filtrada por tenant', async () => {
      await prisma.metadataType.createMany({
        data: [
          { companyId, code: 'TIPO-A', name: 'Tipo A' },
          { companyId, code: 'TIPO-B', name: 'Tipo B' },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/metadata/types')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body.every((t: any) => t.companyId === companyId)).toBe(true);
    });
  });
});
