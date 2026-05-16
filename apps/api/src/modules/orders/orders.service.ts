import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateOrderDto) {
    const items = dto.items.map((item, i) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPriceGs) || 0;
      const disc = Number(item.discountPct) || 0;
      const subtotal = Math.round(qty * price * (1 - disc / 100));
      return {
        lineNumber: i + 1,
        productCode: item.productCode,
        quantity: qty,
        unitPriceGs: price,
        discountPct: disc,
        subtotalGs: subtotal,
      };
    });
    const totalAmountGs = items.reduce((s, i) => s + (i.subtotalGs || 0), 0);

    return this.prisma.order.create({
      data: {
        companyId,
        userId,
        clientCode: dto.clientCode,
        priceList: dto.priceList,
        saleCondition: dto.saleCondition,
        observation: dto.observation,
        latitude: dto.latitude,
        longitude: dto.longitude,
        totalAmountGs,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  findAll(companyId: string, filters?: any) {
    return this.prisma.order.findMany({
      where: {
        companyId,
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.clientCode && { clientCode: filters.clientCode }),
        ...(filters?.status && { status: filters.status }),
      },
      include: { items: true },
      orderBy: { markedAt: 'desc' },
      take: 100,
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
  }

  async updateStatus(companyId: string, id: string, status: OrderStatus) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return this.prisma.order.update({ where: { id }, data: { status } });
  }
}
