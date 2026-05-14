import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';
import { CreateVisitDto } from './dto/create-visit.dto';

@Controller('visits')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('VISITS')
export class VisitsController {
  constructor(private svc: VisitsService) {}

  @Post()
  create(@Body() dto: CreateVisitDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('userId') userId?: string, @Query('clientCode') clientCode?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.findAll(user.companyId!, { userId, clientCode, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }
}
