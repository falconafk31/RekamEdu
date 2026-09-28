import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { Semester } from '@prisma/client';

export class CreatePeriodeDto {
  @IsString()
  @MaxLength(9)
  @Matches(/^\d{4}\/\d{4}$/, {
    message: 'tahunAjaran harus berformat "YYYY/YYYY", mis. "2026/2027".',
  })
  tahunAjaran: string;

  @IsEnum(Semester)
  semester: Semester;
}
