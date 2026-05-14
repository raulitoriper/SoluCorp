import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class GpsPointDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsDateString()
  recordedAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  speed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  heading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  batteryLevel?: number;
}

export class CreateGpsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  points: GpsPointDto[];
}
