import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGuruDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nama?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kelas?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
