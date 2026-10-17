import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { JenisSurat } from '@prisma/client';

export class SuratQueryDto {
  @IsOptional()
  @IsEnum(JenisSurat)
  jenis?: JenisSurat;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsDateString()
  tanggalDari?: string;

  @IsOptional()
  @IsDateString()
  tanggalSampai?: string;

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
