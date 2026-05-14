import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SyncItemDto {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsObject()
  payload: Record<string, unknown>;
}

export class SyncBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncItemDto)
  items: SyncItemDto[];
}
