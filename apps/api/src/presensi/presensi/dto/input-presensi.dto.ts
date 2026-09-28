import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { StatusPresensi } from '@prisma/client';

export class PresensiItemDto {
  @IsString()
  studentId: string;

  @IsEnum(StatusPresensi)
  status: StatusPresensi;
}

export class InputPresensiDto {
  @IsDateString()
  tanggal: string;

  @IsString()
  @MaxLength(20)
  kelas: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PresensiItemDto)
  items: PresensiItemDto[];
}
