import { Test, TestingModule } from '@nestjs/testing';
import { GuardShiftService } from './guard.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('GuardShiftService', () => {
  let service: GuardShiftService;
  let prisma: {
    guardShift: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      guardShift: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardShiftService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GuardShiftService>(GuardShiftService);
  });

  describe('create', () => {
    it('debe pasar companyId del argumento, NUNCA del dto', async () => {
      prisma.guardShift.create.mockResolvedValue({ id: 'shift-1' });

      await service.create('cmp-real', 'usr-1', {
        guardCode: 'GRD001',
      });

      const callArg = prisma.guardShift.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
    });

    it('NO debe aceptar companyId inyectado desde el dto', async () => {
      prisma.guardShift.create.mockResolvedValue({ id: 'shift-2' });

      await service.create('cmp-real', 'usr-1', {
        guardCode: 'GRD001',
        companyId: 'cmp-inyectado',
      } as any);

      const callArg = prisma.guardShift.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
      expect(callArg.companyId).not.toBe('cmp-inyectado');
    });

    it('debe asignar eventType explícitamente en el data de Prisma', async () => {
      prisma.guardShift.create.mockResolvedValue({ id: 'shift-3' });

      await service.create('cmp-1', 'usr-1', {
        guardCode: 'GRD-XYZ',
        eventType: 'START' as any,
        place: 'Puerta Norte',
        observation: 'turno normal',
        latitude: -25.3,
        longitude: -57.5,
      });

      const callArg = prisma.guardShift.create.mock.calls[0][0].data;
      expect(callArg).toMatchObject({
        companyId: 'cmp-1',
        userId: 'usr-1',
        guardCode: 'GRD-XYZ',
        eventType: 'START',
        place: 'Puerta Norte',
        observation: 'turno normal',
      });

      expect(Object.keys(callArg)).toEqual(
        expect.arrayContaining([
          'companyId',
          'userId',
          'guardCode',
          'eventType',
        ]),
      );
    });

    it('sin eventType en dto → Prisma recibe undefined (DB aplica default)', async () => {
      prisma.guardShift.create.mockResolvedValue({ id: 'shift-4' });

      await service.create('cmp-1', 'usr-1', {
        guardCode: 'GRD001',
        // eventType no provisto
      });

      const callArg = prisma.guardShift.create.mock.calls[0][0].data;
      // El service asigna dto.eventType que es undefined — DB puede aplicar default
      expect(callArg.eventType).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('debe filtrar por companyId del argumento', async () => {
      prisma.guardShift.findMany.mockResolvedValue([]);

      await service.findAll('cmp-tenant');

      const whereArg = prisma.guardShift.findMany.mock.calls[0][0].where;
      expect(whereArg.companyId).toBe('cmp-tenant');
    });
  });

  describe('findOne', () => {
    it('debe filtrar por id AND companyId', async () => {
      prisma.guardShift.findFirst.mockResolvedValue(null);

      await service.findOne('cmp-1', 'id-shift');

      const callArg = prisma.guardShift.findFirst.mock.calls[0][0];
      expect(callArg.where).toMatchObject({
        id: 'id-shift',
        companyId: 'cmp-1',
      });
    });
  });
});
