import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    inventoryRecord: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      inventoryRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('create', () => {
    it('debe pasar companyId del argumento, NUNCA del dto', async () => {
      prisma.inventoryRecord.create.mockResolvedValue({ id: 'rec-1' });

      await service.create('cmp-real', 'usr-1', {
        depositCode: 'D01',
        productCode: 'P01',
        quantity: 10,
      } as any);

      const callArg = prisma.inventoryRecord.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
    });

    it('NO debe aceptar companyId inyectado desde el dto', async () => {
      prisma.inventoryRecord.create.mockResolvedValue({ id: 'rec-2' });

      await service.create('cmp-real', 'usr-1', {
        depositCode: 'D01',
        productCode: 'P01',
        quantity: 5,
        companyId: 'cmp-inyectado',
      } as any);

      const callArg = prisma.inventoryRecord.create.mock.calls[0][0].data;
      expect(callArg.companyId).toBe('cmp-real');
      expect(callArg.companyId).not.toBe('cmp-inyectado');
    });

    it('debe asignar campos explícitos del dto al data de Prisma', async () => {
      prisma.inventoryRecord.create.mockResolvedValue({ id: 'rec-3' });

      await service.create('cmp-1', 'usr-1', {
        depositCode: 'DEPOSIT-A',
        productCode: 'PROD-001',
        quantity: 42,
        observation: 'test obs',
        latitude: -25.3,
        longitude: -57.5,
      } as any);

      const callArg = prisma.inventoryRecord.create.mock.calls[0][0].data;
      expect(callArg).toMatchObject({
        companyId: 'cmp-1',
        userId: 'usr-1',
        depositCode: 'DEPOSIT-A',
        productCode: 'PROD-001',
        quantity: 42,
        observation: 'test obs',
        latitude: -25.3,
        longitude: -57.5,
      });

      // Verifica campos esperados presentes
      expect(Object.keys(callArg)).toEqual(
        expect.arrayContaining([
          'companyId',
          'userId',
          'depositCode',
          'productCode',
          'quantity',
        ]),
      );
    });
  });

  describe('findAll', () => {
    it('debe filtrar por companyId del argumento', async () => {
      prisma.inventoryRecord.findMany.mockResolvedValue([]);

      await service.findAll('cmp-tenant');

      const callArg = prisma.inventoryRecord.findMany.mock.calls[0][0];
      expect(callArg.where.companyId).toBe('cmp-tenant');
    });

    it('no debe retornar registros de otro tenant', async () => {
      prisma.inventoryRecord.findMany.mockResolvedValue([{ id: 'r1', companyId: 'cmp-A' }]);

      const result = await service.findAll('cmp-A');

      // El mock de where pasa 'cmp-A' — el service no filtra 'cmp-B'
      const whereArg = prisma.inventoryRecord.findMany.mock.calls[0][0].where;
      expect(whereArg.companyId).toBe('cmp-A');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('debe filtrar por id AND companyId', async () => {
      prisma.inventoryRecord.findFirst.mockResolvedValue(null);

      await service.findOne('cmp-1', 'id-abc');

      const callArg = prisma.inventoryRecord.findFirst.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ id: 'id-abc', companyId: 'cmp-1' });
    });
  });
});
