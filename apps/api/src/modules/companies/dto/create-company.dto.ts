import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() ruc: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() department?: string;

  // Datos del primer admin de la empresa
  @IsString() @IsNotEmpty() adminEmail: string;
  @IsString() @IsNotEmpty() adminFirstName: string;
  @IsString() @IsNotEmpty() adminLastName: string;
  @IsString() @IsNotEmpty() adminPassword: string;

  // Módulos a habilitar
  @IsOptional() @IsArray() @IsString({ each: true }) enabledModules?: string[];
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM'])
  planType?: string;
  @IsOptional()
  @IsEnum(['DEMO', 'ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status?: string;
}
