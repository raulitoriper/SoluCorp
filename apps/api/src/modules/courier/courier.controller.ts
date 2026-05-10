import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CourierService } from './courier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';

@Controller('courier')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('COURIER')
export class CourierController {
  constructor(private svc: CourierService) {}

  @Post()
  create(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('userId') userId?: string) {
    return this.svc.findAll(user.companyId!, { status, userId });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }
}
