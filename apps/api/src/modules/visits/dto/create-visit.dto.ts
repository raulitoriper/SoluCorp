import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { VisitEventType } from '@prisma/client';

export class CreateVisitDto {
  @IsString()
  @IsNotEmpty()
  clientCode: string;

  @IsOptional()
  @IsString()
  motiveCode?: string;

  @IsEnum(VisitEventType)
  eventType: VisitEventType;

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
}
