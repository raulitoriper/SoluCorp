import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GpsService } from './gps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';

@Controller('gps')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('GPS_TRACKING')
export class GpsController {
  constructor(private svc: GpsService) {}

  @Post('batch')
  createBatch(@Body('points') points: any[], @CurrentUser() user: JwtPayload) {
    return this.svc.createBatch(user.companyId!, user.id, points);
  }

  @Get()
  findByUser(@CurrentUser() user: JwtPayload, @Query('userId') userId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.findByUser(user.companyId!, userId, from, to);
  }

  @Get('last-positions')
  getLastPositions(@CurrentUser() user: JwtPayload) {
    return this.svc.getLastPositions(user.companyId!);
  }
}
