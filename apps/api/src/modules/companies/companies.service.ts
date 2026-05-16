import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  UpdateSubscriptionDto,
} from './dto/create-company.dto';

// 14 tipos de metadata estándar del APK original
const DEFAULT_META_TYPES = [
  { code: 'CLIENT', name: 'Cliente' },
  { code: 'PRODUCT', name: 'Producto' },
  { code: 'MOTIVE', name: 'Motivo' },
  { code: 'GUARD', name: 'Guardia' },
  { code: 'DELIVERER', name: 'Repartidor' },
  { code: 'INVOICE_TYPE', name: 'Tipo de Factura' },
  { code: 'EMPLOYEE', name: 'Empleado' },
  { code: 'VEHICLE', name: 'Vehículo' },
  { code: 'BANK', name: 'Banco' },
  { code: 'DEPOSIT', name: 'Depósito' },
  { code: 'CLINIC', name: 'Clínica' },
  { code: 'MEDIC', name: 'Médico' },
  { code: 'CONTACT', name: 'Contacto' },
  { code: 'TICKET_USER', name: 'Usuario Ticket' },
];

const ALL_MODULES = [
  'VISITS',
  'ORDERS',
  'GPS_TRACKING',
  'INVENTORY',
  'ATTENDANCE',
  'GUARD_SECURITY',
  'MEDICAL_VISITS',
  'COURIER',
  'METADATA_CRUD',
];

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { ruc: dto.ruc },
    });
    if (existing) throw new ConflictException('RUC ya registrado');

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const modulesToEnable = dto.enabledModules?.length
      ? dto.enabledModules
      : ALL_MODULES;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear empresa
      const company = await tx.company.create({
        data: {
          name: dto.name,
          ruc: dto.ruc,
          legalName: dto.legalName,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          city: dto.city,
          department: dto.department,
        },
      });

      // 2. Suscripción DEMO (30 días)
      await tx.subscription.create({
        data: {
          companyId: company.id,
          status: 'DEMO',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 3. Config por defecto Paraguay
      await tx.companySettings.create({ data: { companyId: company.id } });

      // 4. Módulos habilitados
      for (const mod of modulesToEnable) {
        await tx.companyModule.create({
          data: { companyId: company.id, module: mod as any },
        });
      }

      // 5. Datos maestros estándar
      for (const mt of DEFAULT_META_TYPES) {
        await tx.metadataType.create({
          data: { companyId: company.id, ...mt, isSystem: true },
        });
      }

      // 6. Usuario COMPANY_ADMIN
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.adminEmail,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          role: 'COMPANY_ADMIN',
        },
      });

      return { company, admin: { id: admin.id, email: admin.email } };
    });
  }

  findAll(search?: string, status?: string) {
    return this.prisma.company.findMany({
      where: {
        ...(search && {
          name: { contains: search, mode: 'insensitive' as const },
        }),
        ...(status && { subscription: { status: status as any } }),
      },
      include: {
        subscription: true,
        _count: { select: { users: true, modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        subscription: true,
        settings: true,
        modules: true,
        _count: { select: { users: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: dto,
      include: { subscription: true },
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.status === 'ACTIVE') data.activatedAt = new Date();
    if (dto.status === 'SUSPENDED') data.suspendedAt = new Date();
    if (dto.status === 'CANCELLED') data.cancelledAt = new Date();
    return this.prisma.subscription.update({ where: { companyId: id }, data });
  }

  async toggleModule(companyId: string, module: string, isEnabled: boolean) {
    return this.prisma.companyModule.upsert({
      where: { companyId_module: { companyId, module: module as any } },
      update: { isEnabled },
      create: { companyId, module: module as any, isEnabled },
    });
  }
}
