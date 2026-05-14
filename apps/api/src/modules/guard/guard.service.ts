import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGuardShiftDto } from './dto/create-guard-shift.dto';

@Injectable()
export class GuardShiftService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, dto: CreateGuardShiftDto) {
    return this.prisma.guardShift.create({
      data: {
        companyId,
        userId,
        guardCode: dto.guardCode,
        eventType: dto.eventType,
        place: dto.place,
        observation: dto.observation,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  findAll(companyId: string, filters?: any) {
    return this.prisma.guardShift.findMany({
      where: { companyId, ...(filters?.guardCode && { guardCode: filters.guardCode }), ...(filters?.from && { markedAt: { gte: new Date(filters.from), ...(filters?.to && { lt: new Date(filters.to) }) } }) },
      orderBy: { markedAt: 'desc' }, take: 100,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.guardShift.findFirst({ where: { id, companyId } });
  }
}
