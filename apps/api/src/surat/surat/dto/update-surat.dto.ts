import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Update surat: semua field opsional. Field `jenis` sengaja TIDAK
// disertakan — jenis menentukan nomor surat yang dibuat otomatis saat
// create, sehingga tidak boleh diubah setelah surat tersimpan.
export class UpdateSuratDto {
  @IsOptional()
  @IsDateString()
  tanggal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pengirim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  penerima?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  perihal?: string;

  @IsOptional()
  @IsString()
  ringkasan?: string;

  // Lihat catatan di CreateSuratDto: URL diisi manual sementara,
  // upload presigned MinIO menyusul di tahap lanjut.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lampiranUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
