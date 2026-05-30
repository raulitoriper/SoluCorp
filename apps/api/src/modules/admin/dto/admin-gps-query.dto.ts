import { IsOptional, IsString } from 'class-validator';

export class AdminGpsQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;
}
