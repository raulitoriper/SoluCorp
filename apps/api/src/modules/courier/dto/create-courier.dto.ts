import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CourierDeliveryStatus } from '@prisma/client';

export class CourierItemDto {
  @IsString()
  @IsNotEmpty()
  barcode: string;
}

export class CreateCourierDto {
  @IsEnum(CourierDeliveryStatus)
  status: CourierDeliveryStatus;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  motiveCode?: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierItemDto)
  items: CourierItemDto[];
}
