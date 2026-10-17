import { IsDateString, IsOptional, IsString } from 'class-validator';

// Filter laporan pemakaian AI:
// ?tenantId=<uuid>&dari=YYYY-MM-DD&sampai=YYYY-MM-DD
export class UsageQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'dari harus tanggal ISO (YYYY-MM-DD).' },
  )
  dari?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'sampai harus tanggal ISO (YYYY-MM-DD).' },
  )
  sampai?: string;
}
