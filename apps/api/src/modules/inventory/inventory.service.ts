import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, dto: CreateInventoryDto) {
    return this.prisma.inventoryRecord.create({
      data: {
        companyId,
        userId,
        depositCode: dto.depositCode,
        productCode: dto.productCode,
        quantity: dto.quantity,
        observation: dto.observation,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  findAll(companyId: string, filters?: any) {
    return this.prisma.inventoryRecord.findMany({
      where: {
        companyId,
        ...(filters?.depositCode && { depositCode: filters.depositCode }),
        ...(filters?.productCode && { productCode: filters.productCode }),
      },
      orderBy: { markedAt: 'desc' },
      take: 100,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.inventoryRecord.findFirst({ where: { id, companyId } });
  }
}
