import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Plan, SubscriptionStatus } from '@prisma/client';

// DTO untuk aktivasi / perubahan paket tenant secara manual oleh Owner.
// Semua field opsional: hanya field yang diisi yang diubah.
// expiresAt: string ISO (boleh "YYYY-MM-DD" atau ISO penuh); null mengosongkan.
export class UpdateTenantDto {
  @IsOptional()
  @IsEnum(Plan, { message: 'plan harus salah satu dari: trial, pro, custom.' })
  plan?: Plan;

  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: 'status harus salah satu dari: active, expired, suspended.',
  })
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'expiresAt harus string tanggal ISO yang valid.' },
  )
  expiresAt?: string | null;
}
