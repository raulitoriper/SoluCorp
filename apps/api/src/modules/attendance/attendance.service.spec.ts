import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    attendanceEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      attendanceEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('create', () => {
    it('debe pasar companyId del argumento, NUNCA del dto', async () => {
      prisma.attendanceEvent.create.mockResolvedValue({ id: 'evt-1' });

      await service.create('cmp-real', 'usr-1', {
        employeeCode: 'EMP001',
        eventCategory: 'REGULAR' as any,
        eventAction: 'CHECK_IN' as any,
      });

      const callArg = prisma.attendanceEvent.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
    });

    it('NO debe aceptar companyId inyectado desde el dto', async () => {
      prisma.attendanceEvent.create.mockResolvedValue({ id: 'evt-2' });

      await service.create('cmp-real', 'usr-1', {
        employeeCode: 'EMP001',
        eventCategory: 'REGULAR' as any,
        eventAction: 'CHECK_IN' as any,
        companyId: 'cmp-inyectado',
      } as any);

      const callArg = prisma.attendanceEvent.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
      expect(callArg.companyId).not.toBe('cmp-inyectado');
    });

    it('debe asignar campos explícitos (employeeCode, eventCategory, eventAction) al data de Prisma', async () => {
      prisma.attendanceEvent.create.mockResolvedValue({ id: 'evt-3' });

      await service.create('cmp-1', 'usr-1', {
        employeeCode: 'EMP-XYZ',
        eventCategory: 'REGULAR' as any,
        eventAction: 'CHECK_OUT' as any,
        observation: 'salida normal',
        latitude: -25.3,
        longitude: -57.5,
      });

      const callArg = prisma.attendanceEvent.create.mock.calls[0][0].data;
      expect(callArg).toMatchObject({
        companyId: 'cmp-1',
        userId: 'usr-1',
        employeeCode: 'EMP-XYZ',
        eventCategory: 'REGULAR',
        eventAction: 'CHECK_OUT',
        observation: 'salida normal',
        latitude: -25.3,
        longitude: -57.5,
      });

      expect(Object.keys(callArg)).toEqual(
        expect.arrayContaining([
          'companyId',
          'userId',
          'employeeCode',
          'eventCategory',
          'eventAction',
        ]),
      );
    });
  });

  describe('findAll', () => {
    it('debe filtrar por companyId del argumento', async () => {
      prisma.attendanceEvent.findMany.mockResolvedValue([]);

      await service.findAll('cmp-tenant');

      const whereArg = prisma.attendanceEvent.findMany.mock.calls[0][0].where;
      expect(whereArg.companyId).toBe('cmp-tenant');
    });
  });

  describe('findOne', () => {
    it('debe filtrar por id AND companyId', async () => {
      prisma.attendanceEvent.findFirst.mockResolvedValue(null);

      await service.findOne('cmp-1', 'id-evt');

      const callArg = prisma.attendanceEvent.findFirst.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ id: 'id-evt', companyId: 'cmp-1' });
    });
  });
});
