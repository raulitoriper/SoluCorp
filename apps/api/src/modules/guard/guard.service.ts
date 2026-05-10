import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GuardShiftService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, data: any) {
    return this.prisma.guardShift.create({ data: { companyId, userId, ...data } });
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
