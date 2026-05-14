import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateMetadataItemDto, UpdateMetadataItemDto } from './dto/metadata-item.dto';

@Controller('metadata')
@UseGuards(JwtAuthGuard)
export class MetadataController {
  constructor(private metadataService: MetadataService) {}

  @Get('types')
  findAllTypes(@CurrentUser() user: JwtPayload) {
    return this.metadataService.findAllTypes(user.companyId!);
  }

  @Get(':typeCode/items')
  findItems(@Param('typeCode') typeCode: string, @CurrentUser() user: JwtPayload) {
    return this.metadataService.findItems(user.companyId!, typeCode);
  }

  @Post(':typeCode/items')
  createItem(@Param('typeCode') typeCode: string, @Body() dto: CreateMetadataItemDto, @CurrentUser() user: JwtPayload) {
    return this.metadataService.createItem(user.companyId!, typeCode, dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateMetadataItemDto, @CurrentUser() user: JwtPayload) {
    return this.metadataService.updateItem(user.companyId!, id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.metadataService.deleteItem(user.companyId!, id);
  }
}
