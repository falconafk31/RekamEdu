import { IsString, IsUUID, MaxLength } from 'class-validator';

export class RekapSemesterQueryDto {
  @IsString()
  @IsUUID()
  periodeId: string;

  @IsString()
  @MaxLength(20)
  kelas: string;
}
