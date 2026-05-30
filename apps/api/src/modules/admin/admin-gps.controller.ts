import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { AdminGpsService } from './admin-gps.service';
import { AdminGpsQueryDto } from './dto/admin-gps-query.dto';

@Controller('admin/gps')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminGpsController {
  constructor(private readonly svc: AdminGpsService) {}

  @Get('last-positions')
  getLastPositions(@Query() query: AdminGpsQueryDto) {
    return this.svc.getLastPositions(query.companyId);
  }
}
