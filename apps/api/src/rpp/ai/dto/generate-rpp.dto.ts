import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateRppDto {
  @IsString()
  @MinLength(1)
  aiModelId: string;

  @IsString()
  @MaxLength(30)
  jenjang: string;

  @IsString()
  @MaxLength(30)
  kelas: string;

  @IsString()
  @MaxLength(100)
  mapel: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  materiPokok: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelPembelajaran?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  durasiMenit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tujuanTambahan?: string;
}
