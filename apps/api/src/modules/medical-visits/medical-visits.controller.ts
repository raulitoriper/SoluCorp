import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MedicalVisitsService } from './medical-visits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';
import { CreateMedicalVisitDto } from './dto/create-medical-visit.dto';

@Controller('medical-visits')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('MEDICAL_VISITS')
export class MedicalVisitsController {
  constructor(private svc: MedicalVisitsService) {}

  @Post()
  create(@Body() dto: CreateMedicalVisitDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('clinicCode') clinicCode?: string,
    @Query('medicCode') medicCode?: string,
  ) {
    return this.svc.findAll(user.companyId!, { clinicCode, medicCode });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }
}
