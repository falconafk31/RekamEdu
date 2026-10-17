import { Type } from 'class-transformer';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { KehadiranDto } from './create-jurnal.dto';

export class UpdateJurnalDto {
  @IsOptional()
  @IsDateString()
  tanggal?: string;

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
