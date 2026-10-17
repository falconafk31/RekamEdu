import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Ringkasan kehadiran per pertemuan: { hadir, izin, sakit, alfa }.
export class KehadiranDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  hadir?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  izin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sakit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  alfa?: number;
}

export class CreateJurnalDto {
  @IsDateString()
  @IsNotEmpty()
  tanggal: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kelas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mapel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  materi?: string;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => KehadiranDto)
  kehadiran?: KehadiranDto;
}
