import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JenisKelamin, StatusSiswa } from '@prisma/client';

export class UpdateSiswaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nisn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nama?: string;

  @IsOptional()
  @IsEnum(JenisKelamin)
  jk?: JenisKelamin;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kelas?: string;

  @IsOptional()
  @IsEnum(StatusSiswa)
  status?: StatusSiswa;

  @IsOptional()
  @IsDateString()
  tanggalMasuk?: string;

  @IsOptional()
  @IsDateString()
  tanggalKeluar?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;
}
