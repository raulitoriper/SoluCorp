import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: {
    syncQueueItem: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      syncQueueItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  const validItem = {
    entityType: 'visit',
    idempotencyKey: 'key-001',
    payload: { clientCode: 'CLI-01', eventType: 'ARRIVAL' },
  };

  describe('processBatch', () => {
    it('item nuevo (idempotencyKey no existe) → procesa y crea record con status SYNCED', async () => {
      prisma.syncQueueItem.findUnique.mockResolvedValue(null); // no existe
      prisma.syncQueueItem.create.mockResolvedValue({ id: 'sq-1', idempotencyKey: 'key-001' });

      const result = await service.processBatch('cmp-1', 'usr-1', [validItem]);

      expect(prisma.syncQueueItem.create).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(1);
      expect(result.results[0]).toMatchObject({
        idempotencyKey: 'key-001',
        status: 'SYNCED',
      });
    });

    it('item duplicado (idempotencyKey ya existe) → retorna ALREADY_SYNCED sin crear nuevo', async () => {
      const existingRecord = { id: 'sq-existing', idempotencyKey: 'key-001', resultId: 'res-1' };
      prisma.syncQueueItem.findUnique.mockResolvedValue(existingRecord);

      const result = await service.processBatch('cmp-1', 'usr-1', [validItem]);

      // NO debe llamar a create cuando ya existe
      expect(prisma.syncQueueItem.create).not.toHaveBeenCalled();
      expect(result.results[0]).toMatchObject({
        idempotencyKey: 'key-001',
        status: 'ALREADY_SYNCED',
      });
    });

    it('batch parcial (3 items, 1 falla) → retorna resultado por item con estados mezclados', async () => {
      const items = [
        { entityType: 'visit', idempotencyKey: 'key-A', payload: { clientCode: 'CLI-A' } },
        { entityType: 'visit', idempotencyKey: 'key-B', payload: { clientCode: 'CLI-B' } },
        { entityType: 'visit', idempotencyKey: 'key-C', payload: { clientCode: 'CLI-C' } },
      ];

      // key-A: nuevo → OK
      // key-B: duplicado → ALREADY_SYNCED
      // key-C: nuevo pero create falla → FAILED
      prisma.syncQueueItem.findUnique
        .mockResolvedValueOnce(null)       // key-A: no existe
        .mockResolvedValueOnce({ id: 'sq-b', idempotencyKey: 'key-B', resultId: null }) // key-B: existe
        .mockResolvedValueOnce(null);      // key-C: no existe

      prisma.syncQueueItem.create
        .mockResolvedValueOnce({ id: 'sq-a', idempotencyKey: 'key-A' }) // key-A: OK
        .mockRejectedValueOnce(new Error('DB constraint violation'));    // key-C: falla

      const result = await service.processBatch('cmp-1', 'usr-1', items);

      expect(result.processed).toBe(3);
      expect(result.results).toHaveLength(3);

      const resultMap = Object.fromEntries(
        result.results.map((r: any) => [r.idempotencyKey, r]),
      );

      expect(resultMap['key-A'].status).toBe('SYNCED');
      expect(resultMap['key-B'].status).toBe('ALREADY_SYNCED');
      expect(resultMap['key-C'].status).toBe('FAILED');
      expect(resultMap['key-C'].error).toBeDefined();
    });

    it('batch vacío → retorna processed: 0 y results vacíos', async () => {
      const result = await service.processBatch('cmp-1', 'usr-1', []);

      expect(result.processed).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(prisma.syncQueueItem.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findPending', () => {
    it('debe filtrar por companyId y userId con status PENDING', async () => {
      prisma.syncQueueItem.findMany.mockResolvedValue([]);

      await service.findPending('cmp-1', 'usr-1');

      const callArg = prisma.syncQueueItem.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({
        companyId: 'cmp-1',
        userId: 'usr-1',
        status: 'PENDING',
      });
    });
  });
});
