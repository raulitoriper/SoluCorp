import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('ORDERS')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
    @Query('clientCode') clientCode?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(user.companyId!, { userId, clientCode, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateStatus(user.companyId!, id, dto.status);
  }
}
