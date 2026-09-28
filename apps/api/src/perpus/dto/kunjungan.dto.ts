import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { POLA_TANGGAL } from '../common/tanggal.util';

// DTO pencatatan kunjungan perpustakaan.
// tanggal opsional — bila dihilangkan, service memakai hari ini (WIB).
export class CreateKunjunganDto {
  @IsString()
  @IsNotEmpty({ message: 'studentId wajib diisi.' })
  studentId: string;

  @IsOptional()
  @IsString()
  @Matches(POLA_TANGGAL, { message: 'tanggal harus berformat YYYY-MM-DD.' })
  tanggal?: string;
}

// Query GET /perpus/kunjungan: filter satu tanggal ATAU rentang dari–sampai.
export class KunjunganQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Matches(POLA_TANGGAL, { message: 'tanggal harus berformat YYYY-MM-DD.' })
  tanggal?: string;

  @IsOptional()
  @IsString()
  @Matches(POLA_TANGGAL, { message: 'dari harus berformat YYYY-MM-DD.' })
  dari?: string;

  @IsOptional()
  @IsString()
  @Matches(POLA_TANGGAL, { message: 'sampai harus berformat YYYY-MM-DD.' })
  sampai?: string;
}
