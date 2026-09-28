import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

// DTO pembuatan data buku. stok opsional — bila dihilangkan,
// nilai default skema Prisma (1) yang dipakai.
export class CreateBukuDto {
  @IsString()
  @IsNotEmpty({ message: 'judul wajib diisi.' })
  @MaxLength(255)
  judul: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pengarang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  penerbit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  tahunTerbit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isbn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stok harus bilangan bulat.' })
  @Min(0, { message: 'stok minimal 0.' })
  stok?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  kategori?: string;
}

// DTO pembaruan parsial buku (PATCH): seluruh field opsional.
export class UpdateBukuDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'judul tidak boleh kosong.' })
  @MaxLength(255)
  judul?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pengarang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  penerbit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  tahunTerbit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isbn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stok harus bilangan bulat.' })
  @Min(0, { message: 'stok minimal 0.' })
  stok?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  kategori?: string;
}

// Query GET /perpus/buku: pencarian teks + filter kategori + paginasi.
export class BukuQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  kategori?: string;
}
