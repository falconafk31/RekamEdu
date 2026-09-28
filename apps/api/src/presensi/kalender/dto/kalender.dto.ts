import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatusHari } from '@prisma/client';

export class KalenderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  tahun?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  bulan?: number;
}

export class SetKalenderDto {
  @IsEnum(StatusHari)
  status: StatusHari;
}
