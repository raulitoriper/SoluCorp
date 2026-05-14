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
import { GuardShiftEventType } from '@prisma/client';

export class CreateGuardShiftDto {
  @IsString()
  @IsNotEmpty()
  guardCode: string;

  @IsOptional()
  @IsEnum(GuardShiftEventType)
  eventType?: GuardShiftEventType;

  @IsOptional()
  @IsString()
  place?: string;

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
