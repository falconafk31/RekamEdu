import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePengaturanDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  namaSekolah?: string;

  @IsOptional()
  @IsString()
  alamat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  kepalaSekolah?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nipKepalaSekolah?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daftarKelas?: string[];

  @IsOptional()
  @IsString()
  kopBaris2?: string;

  @IsOptional()
  @IsString()
  kopBaris3?: string;

  @IsOptional()
  @IsString()
  kopBaris4?: string;

  @IsOptional()
  @IsString()
  kopBaris5?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  namaPerpustakaan?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  hariLiburMingguan?: number[];
}
