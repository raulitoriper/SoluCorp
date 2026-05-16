import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GuardShiftService } from './guard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';
import { CreateGuardShiftDto } from './dto/create-guard-shift.dto';

@Controller('guard-shifts')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('GUARD_SECURITY')
export class GuardShiftController {
  constructor(private svc: GuardShiftService) {}

  @Post()
  create(@Body() dto: CreateGuardShiftDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('guardCode') guardCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.findAll(user.companyId!, { guardCode, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }
}
