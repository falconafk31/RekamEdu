import { IsDateString, IsString, MaxLength } from 'class-validator';

export class PresensiQueryDto {
  @IsDateString()
  tanggal: string;

  @IsString()
  @MaxLength(20)
  kelas: string;
}
