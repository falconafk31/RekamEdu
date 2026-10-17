import { IsEnum, IsString } from 'class-validator';
import { Plan } from '@prisma/client';

// Mengizinkan satu model AI dipakai oleh satu paket langganan.
export class CreatePlanModelDto {
  @IsEnum(Plan, { message: 'plan harus salah satu dari: trial, pro, custom.' })
  plan: Plan;

  @IsString()
  aiModelId: string;
}
