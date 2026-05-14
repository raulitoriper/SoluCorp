import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  depositCode: string;

  @IsString()
  @IsNotEmpty()
  productCode: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  quantity: number;

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
