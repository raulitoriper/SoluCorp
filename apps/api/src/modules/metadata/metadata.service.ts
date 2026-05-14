import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMetadataItemDto, UpdateMetadataItemDto } from './dto/metadata-item.dto';

@Injectable()
export class MetadataService {
  constructor(private prisma: PrismaService) {}

  // --- Tipos de metadata ---
  findAllTypes(companyId: string) {
    return this.prisma.metadataType.findMany({
      where: { companyId },
      include: { _count: { select: { items: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // --- Items de metadata ---
  findItems(companyId: string, typeCode: string) {
    return this.prisma.metadataItem.findMany({
      where: { companyId, metadataType: { code: typeCode }, isActive: true },
      orderBy: { value: 'asc' },
    });
  }

  async createItem(companyId: string, typeCode: string, dto: CreateMetadataItemDto) {
    const type = await this.prisma.metadataType.findUnique({ where: { companyId_code: { companyId, code: typeCode } } });
    if (!type) throw new NotFoundException('Tipo de metadata no encontrado');

    return this.prisma.metadataItem.create({
      data: { companyId, metadataTypeId: type.id, code: dto.code, value: dto.value, extraData: dto.extraData as Prisma.InputJsonValue | undefined },
    });
  }

  async updateItem(companyId: string, id: string, dto: UpdateMetadataItemDto) {
    const item = await this.prisma.metadataItem.findFirst({ where: { id, companyId } });
    if (!item) throw new NotFoundException('Item no encontrado');

    return this.prisma.metadataItem.update({ where: { id }, data: { value: dto.value, extraData: dto.extraData as Prisma.InputJsonValue | undefined } });
  }

  async deleteItem(companyId: string, id: string) {
    const item = await this.prisma.metadataItem.findFirst({ where: { id, companyId } });
    if (!item) throw new NotFoundException('Item no encontrado');

    return this.prisma.metadataItem.update({ where: { id }, data: { isActive: false } });
  }
}
