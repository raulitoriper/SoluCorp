import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('ATTENDANCE')
export class AttendanceController {
  constructor(private svc: AttendanceService) {}

  @Post()
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('employeeCode') employeeCode?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.findAll(user.companyId!, { employeeCode, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }
}
