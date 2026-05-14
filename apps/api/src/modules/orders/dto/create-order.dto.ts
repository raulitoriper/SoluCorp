import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitPriceGs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  discountPct?: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  clientCode: string;

  @IsOptional()
  @IsString()
  priceList?: string;

  @IsOptional()
  @IsString()
  saleCondition?: string;

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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
