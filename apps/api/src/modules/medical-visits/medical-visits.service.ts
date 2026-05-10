import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MedicalVisitsService {
  constructor(private prisma: PrismaService) {}

  create(companyId: string, userId: string, dto: any) {
    const products = (dto.products || []).map((p: any, i: number) => ({
      lineNumber: i + 1, productCode: p.productCode, quantity: Number(p.quantity) || 0,
    }));

    return this.prisma.medicalVisit.create({
      data: {
        companyId, userId, eventType: dto.eventType, clinicCode: dto.clinicCode,
        medicCode: dto.medicCode, motiveCode: dto.motiveCode, initialKm: dto.initialKm,
        nextVisitDate: dto.nextVisitDate ? new Date(dto.nextVisitDate) : null,
        shouldNotify: dto.shouldNotify ?? false, notificationDesc: dto.notificationDesc,
        observation: dto.observation, latitude: dto.latitude, longitude: dto.longitude,
        products: { create: products },
      },
      include: { products: true },
    });
  }

  findAll(companyId: string, filters?: any) {
    return this.prisma.medicalVisit.findMany({
      where: { companyId, ...(filters?.clinicCode && { clinicCode: filters.clinicCode }), ...(filters?.medicCode && { medicCode: filters.medicCode }) },
      include: { products: true },
      orderBy: { markedAt: 'desc' }, take: 100,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.medicalVisit.findFirst({ where: { id, companyId }, include: { products: true } });
  }
}
