import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async processBatch(companyId: string, userId: string, items: { entityType: string; idempotencyKey: string; payload: any }[]) {
    const results = [];

    for (const item of items) {
      // Verificar si ya fue procesado (idempotency)
      const existing = await this.prisma.syncQueueItem.findUnique({ where: { idempotencyKey: item.idempotencyKey } });
      if (existing) {
        results.push({ idempotencyKey: item.idempotencyKey, status: 'ALREADY_SYNCED', resultId: existing.resultId });
        continue;
      }

      try {
        const created = await this.prisma.syncQueueItem.create({
          data: {
            companyId, userId,
            entityType: item.entityType,
            idempotencyKey: item.idempotencyKey,
            payload: item.payload,
            status: 'SYNCED',
            processedAt: new Date(),
          },
        });
        results.push({ idempotencyKey: item.idempotencyKey, status: 'SYNCED', id: created.id });
      } catch (error: any) {
        results.push({ idempotencyKey: item.idempotencyKey, status: 'FAILED', error: error.message });
      }
    }

    return { processed: results.length, results };
  }

  findPending(companyId: string, userId: string) {
    return this.prisma.syncQueueItem.findMany({
      where: { companyId, userId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }
}
