import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, dto: CreateVisitDto) {
    return this.prisma.visit.create({ data: { companyId, userId, ...dto } });
  }

  findAll(companyId: string, filters?: { userId?: string; clientCode?: string; from?: string; to?: string }) {
    return this.prisma.visit.findMany({
      where: {
        companyId,
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.clientCode && { clientCode: filters.clientCode }),
        ...(filters?.from && { markedAt: { gte: new Date(filters.from), ...(filters?.to && { lt: new Date(filters.to) }) } }),
      },
      orderBy: { markedAt: 'desc' },
      take: 100,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.visit.findFirst({ where: { id, companyId } });
  }
}
