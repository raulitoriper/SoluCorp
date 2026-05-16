import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { ModuleGuard, RequireModule } from '../../common/guards/module.guard';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequireModule('INVENTORY')
export class InventoryController {
  constructor(private svc: InventoryService) {}

  @Post()
  create(@Body() dto: CreateInventoryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(user.companyId!, user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('depositCode') depositCode?: string,
    @Query('productCode') productCode?: string,
  ) {
    return this.svc.findAll(user.companyId!, { depositCode, productCode });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(user.companyId!, id);
  }
}
