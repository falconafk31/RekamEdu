import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSuratTemplateDto {
  @IsString()
  @MaxLength(100)
  nama: string;

  @IsString()
  isi: string;
}

export class UpdateSuratTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nama?: string;

  @IsOptional()
  @IsString()
  isi?: string;
}
