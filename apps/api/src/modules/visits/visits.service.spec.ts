import { Test, TestingModule } from '@nestjs/testing';
import { VisitsService } from './visits.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * visits.service.spec.ts
 *
 * TDD ligero (C.1 → C.2): este spec se escribe ANTES del refactor W01.
 * Con el código actual (data: { companyId, userId, ...dto }), los tests
 * C.1.2 y C.1.3 FALLAN porque el spread incluye cualquier campo del dto,
 * incluyendo un `companyId` inyectado maliciosamente.
 *
 * Después del refactor W01 (C.2), TODOS los tests deben pasar (verde).
 */
describe('VisitsService', () => {
  let service: VisitsService;
  let prisma: {
    visit: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      visit: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VisitsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<VisitsService>(VisitsService);
  });

  describe('create', () => {
    it('debe pasar companyId del argumento, NUNCA del dto', async () => {
      prisma.visit.create.mockResolvedValue({ id: 'visit-1' });

      await service.create('cmp-real', 'usr-1', {
        clientCode: 'CLI-001',
        eventType: 'ARRIVAL' as any,
      });

      const callArg = prisma.visit.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
    });

    it('companyId inyectado en dto NO debe sobrescribir el argumento', async () => {
      prisma.visit.create.mockResolvedValue({ id: 'visit-2' });

      // Simula un dto con companyId malicioso (como si el ValidationPipe no lo bloqueara)
      await service.create('cmp-real', 'usr-1', {
        clientCode: 'CLI-001',
        eventType: 'ARRIVAL' as any,
        companyId: 'cmp-malicioso',
      } as any);

      const callArg = prisma.visit.create.mock.calls[0][0].data;
      // DEBE usar 'cmp-real' del argumento, no 'cmp-malicioso' del dto
      expect(callArg.companyId).toBe('cmp-real');
      expect(callArg.companyId).not.toBe('cmp-malicioso');
    });

    it('debe pasar los 6 campos del dto de forma explícita', async () => {
      prisma.visit.create.mockResolvedValue({ id: 'visit-3' });

      await service.create('cmp-1', 'usr-1', {
        clientCode: 'CLI-XYZ',
        motiveCode: 'MOT-001',
        eventType: 'DEPARTURE' as any,
        observation: 'obs de test',
        latitude: -25.3,
        longitude: -57.5,
      });

      const callArg = prisma.visit.create.mock.calls[0][0].data;
      expect(callArg).toMatchObject({
        companyId: 'cmp-1',
        userId: 'usr-1',
        clientCode: 'CLI-XYZ',
        motiveCode: 'MOT-001',
        eventType: 'DEPARTURE',
        observation: 'obs de test',
        latitude: -25.3,
        longitude: -57.5,
      });
    });

    it('el objeto data NO debe contener claves extras del dto (sin spread)', async () => {
      prisma.visit.create.mockResolvedValue({ id: 'visit-4' });

      await service.create('cmp-1', 'usr-1', {
        clientCode: 'CLI-001',
        motiveCode: 'MOT-001',
        eventType: 'ARRIVAL' as any,
        observation: 'obs',
        latitude: -25.3,
        longitude: -57.5,
      });

      const callArg = prisma.visit.create.mock.calls[0][0].data;
      const keys = Object.keys(callArg).sort();

      // Solo deben existir estas 8 claves exactas — sin extras del dto
      expect(keys).toEqual(
        [
          'clientCode',
          'companyId',
          'eventType',
          'latitude',
          'longitude',
          'motiveCode',
          'observation',
          'userId',
        ].sort(),
      );
    });
  });

  describe('findAll', () => {
    it('debe filtrar por companyId del argumento', async () => {
      prisma.visit.findMany.mockResolvedValue([]);

      await service.findAll('cmp-tenant');

      const whereArg = prisma.visit.findMany.mock.calls[0][0].where;
      expect(whereArg.companyId).toBe('cmp-tenant');
    });
  });

  describe('findOne', () => {
    it('debe filtrar por id AND companyId', async () => {
      prisma.visit.findFirst.mockResolvedValue(null);

      await service.findOne('cmp-1', 'id-visit');

      const callArg = prisma.visit.findFirst.mock.calls[0][0];
      expect(callArg.where).toMatchObject({
        id: 'id-visit',
        companyId: 'cmp-1',
      });
    });
  });
});
