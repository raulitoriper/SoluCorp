import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, data: any) {
    return this.prisma.attendanceEvent.create({ data: { companyId, userId, ...data } });
  }

  findAll(companyId: string, filters?: any) {
    return this.prisma.attendanceEvent.findMany({
      where: { companyId, ...(filters?.employeeCode && { employeeCode: filters.employeeCode }), ...(filters?.from && { markedAt: { gte: new Date(filters.from), ...(filters?.to && { lt: new Date(filters.to) }) } }) },
      orderBy: { markedAt: 'desc' }, take: 200,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.attendanceEvent.findFirst({ where: { id, companyId } });
  }
}
