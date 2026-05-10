import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

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
  createItem(@Param('typeCode') typeCode: string, @Body() body: { code: string; value: string; extraData?: any }, @CurrentUser() user: JwtPayload) {
    return this.metadataService.createItem(user.companyId!, typeCode, body.code, body.value, body.extraData);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() body: { value: string; extraData?: any }, @CurrentUser() user: JwtPayload) {
    return this.metadataService.updateItem(user.companyId!, id, body.value, body.extraData);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.metadataService.deleteItem(user.companyId!, id);
  }
}
