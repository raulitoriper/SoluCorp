import { Module } from '@nestjs/common';
import { MedicalVisitsService } from './medical-visits.service';
import { MedicalVisitsController } from './medical-visits.controller';
@Module({
  controllers: [MedicalVisitsController],
  providers: [MedicalVisitsService],
})
export class MedicalVisitsModule {}
