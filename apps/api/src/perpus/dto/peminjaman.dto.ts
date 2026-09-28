import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { StatusPinjaman } from '@prisma/client';
import { PaginationQueryDto } from './pagination.dto';
import { POLA_TANGGAL } from '../common/tanggal.util';

// DTO pencatatan peminjaman baru.
// tanggalPinjam diisi otomatis hari ini oleh service.
export class CreatePeminjamanDto {
  @IsString()
  @IsNotEmpty({ message: 'bookId wajib diisi.' })
  bookId: string;

  @IsString()
  @IsNotEmpty({ message: 'studentId wajib diisi.' })
  studentId: string;

  @IsString()
  @Matches(POLA_TANGGAL, {
    message: 'tanggalKembaliSeharusnya harus berformat YYYY-MM-DD.',
  })
  tanggalKembaliSeharusnya: string;
}

// Query GET /perpus/peminjaman: filter status + pencarian nama/NISN/judul.
export class PeminjamanQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StatusPinjaman, { message: 'status tidak dikenal.' })
  status?: StatusPinjaman;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}

// DTO pengembalian buku: tanggal aktual opsional (default hari ini).
export class KembalikanPeminjamanDto {
  @IsOptional()
  @IsString()
  @Matches(POLA_TANGGAL, {
    message: 'tanggalKembaliAktual harus berformat YYYY-MM-DD.',
  })
  tanggalKembaliAktual?: string;
}
