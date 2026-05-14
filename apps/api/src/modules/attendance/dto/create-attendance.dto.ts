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
import { AttendanceAction, AttendanceCategory } from '@prisma/client';

export class CreateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsEnum(AttendanceCategory)
  eventCategory: AttendanceCategory;

  @IsEnum(AttendanceAction)
  eventAction: AttendanceAction;

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
