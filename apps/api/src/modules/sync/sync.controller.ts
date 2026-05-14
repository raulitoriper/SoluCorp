import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { SyncBatchDto } from './dto/sync-batch.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private svc: SyncService) {}

  @Post('batch')
  processBatch(@Body() dto: SyncBatchDto, @CurrentUser() user: JwtPayload) {
    return this.svc.processBatch(user.companyId!, user.id, dto.items);
  }

  @Get('pending')
  findPending(@CurrentUser() user: JwtPayload) {
    return this.svc.findPending(user.companyId!, user.id);
  }
}
