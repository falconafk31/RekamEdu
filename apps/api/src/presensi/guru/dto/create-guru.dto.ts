import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGuruDto {
  @IsString()
  @MaxLength(50)
  username: string;

  @IsString()
  @MaxLength(100)
  nama: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter.' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kelas?: string;
}
