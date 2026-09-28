import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertRiwayatKelasDto {
  @IsString()
  studentId: string;

  @IsString()
  @MaxLength(9)
  tahunAjaran: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kelas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  waliKelas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class RiwayatKelasQueryDto {
  @IsOptional()
  @IsString()
  tahunAjaran?: string;

  @IsOptional()
  @IsString()
  kelas?: string;
}
