import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { JenisDokumen, StatusDokumen } from '@prisma/client';

export class DokumenQueryDto {
  @IsOptional()
  @IsEnum(JenisDokumen)
  jenis?: JenisDokumen;

  @IsOptional()
  @IsEnum(StatusDokumen)
  status?: StatusDokumen;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 20;
}
