import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JenisSurat } from '@prisma/client';

export class CreateSuratDto {
  @IsEnum(JenisSurat)
  jenis: JenisSurat;

  @IsDateString()
  tanggal: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pengirim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  penerima?: string;

  @IsString()
  @MaxLength(300)
  perihal: string;

  @IsOptional()
  @IsString()
  ringkasan?: string;

  // CATATAN LAMPIRAN: field ini menampung URL file di MinIO.
  // Endpoint upload presigned MinIO BELUM dibangun (tahap lanjut),
  // sehingga frontend untuk sementara mengisi URL manual.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lampiranUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
