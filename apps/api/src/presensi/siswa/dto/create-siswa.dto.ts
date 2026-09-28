import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JenisKelamin } from '@prisma/client';

export class CreateSiswaDto {
  @IsString()
  @MaxLength(30)
  nisn: string;

  @IsString()
  @MaxLength(100)
  nama: string;

  @IsOptional()
  @IsEnum(JenisKelamin)
  jk?: JenisKelamin;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kelas?: string;

  @IsOptional()
  @IsDateString()
  tanggalMasuk?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;
}
