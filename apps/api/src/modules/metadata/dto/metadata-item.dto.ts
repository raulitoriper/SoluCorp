import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMetadataItemDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;
}

export class UpdateMetadataItemDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsObject()
  extraData?: Record<string, unknown>;
}
