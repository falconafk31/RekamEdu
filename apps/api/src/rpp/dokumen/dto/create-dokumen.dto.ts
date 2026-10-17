import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JenisDokumen, StatusDokumen } from '@prisma/client';

export class CreateDokumenDto {
  @IsEnum(JenisDokumen)
  jenis: JenisDokumen;

  @IsString()
  @MaxLength(200)
  judul: string;

  @IsString()
  konten: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(StatusDokumen)
  status?: StatusDokumen;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  aiModelId?: string;
}
