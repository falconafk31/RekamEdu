import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StatusDokumen } from '@prisma/client';

export class UpdateDokumenDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  judul?: string;

  @IsOptional()
  @IsString()
  konten?: string;

  @IsOptional()
  @IsEnum(StatusDokumen)
  status?: StatusDokumen;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
