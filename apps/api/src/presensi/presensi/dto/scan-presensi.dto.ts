import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StatusPresensi } from '@prisma/client';

export class ScanPresensiDto {
  @IsString()
  @MaxLength(30)
  nisn: string;

  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @IsOptional()
  @IsEnum(StatusPresensi)
  status?: StatusPresensi;
}
