import { Module } from '@nestjs/common';
import { AdminGpsController } from './admin-gps.controller';
import { AdminGpsService } from './admin-gps.service';

@Module({
  controllers: [AdminGpsController],
  providers: [AdminGpsService],
})
export class AdminModule {}
