import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MedicalVisitEventType } from '@prisma/client';

export class MedicalVisitProductDto {
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  quantity: number;
}

export class CreateMedicalVisitDto {
  @IsEnum(MedicalVisitEventType)
  eventType: MedicalVisitEventType;

  @IsOptional()
  @IsString()
  clinicCode?: string;

  @IsOptional()
  @IsString()
  medicCode?: string;

  @IsOptional()
  @IsString()
  motiveCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  initialKm?: number;

  @IsOptional()
  @IsDateString()
  nextVisitDate?: string;

  @IsOptional()
  @IsBoolean()
  shouldNotify?: boolean;

  @IsOptional()
  @IsString()
  notificationDesc?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalVisitProductDto)
  products?: MedicalVisitProductDto[];
}
