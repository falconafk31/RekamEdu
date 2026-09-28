import { IsDateString, IsString, MaxLength } from 'class-validator';

export class RekapQueryDto {
  @IsDateString()
  dari: string;

  @IsDateString()
  sampai: string;

  @IsString()
  @MaxLength(20)
  kelas: string;
}
