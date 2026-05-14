import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCourierDto } from './dto/create-courier.dto';

@Injectable()
export class CourierService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, dto: CreateCourierDto) {
    const items = dto.items.map((item, i) => ({
      lineNumber: i + 1, barcode: item.barcode,
    }));

    return this.prisma.courierDelivery.create({
      data: {
        companyId, userId, status: dto.status, receiverName: dto.receiverName,
        motiveCode: dto.motiveCode, observation: dto.observation,
        latitude: dto.latitude, longitude: dto.longitude,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  findAll(companyId: string, filters?: any) {
    return this.prisma.courierDelivery.findMany({
      where: { companyId, ...(filters?.status && { status: filters.status }), ...(filters?.userId && { userId: filters.userId }) },
      include: { items: true },
      orderBy: { markedAt: 'desc' }, take: 100,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.courierDelivery.findFirst({ where: { id, companyId }, include: { items: true } });
  }
}
