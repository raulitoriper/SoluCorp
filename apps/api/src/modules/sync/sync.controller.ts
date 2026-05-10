import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private svc: SyncService) {}

  @Post('batch')
  processBatch(@Body('items') items: any[], @CurrentUser() user: JwtPayload) {
    return this.svc.processBatch(user.companyId!, user.id, items);
  }

  @Get('pending')
  findPending(@CurrentUser() user: JwtPayload) {
    return this.svc.findPending(user.companyId!, user.id);
  }
}
