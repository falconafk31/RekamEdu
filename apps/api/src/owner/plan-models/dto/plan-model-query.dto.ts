import { IsEnum, IsOptional } from 'class-validator';
import { Plan } from '@prisma/client';

// Filter opsional: ?plan=trial|pro|custom.
export class PlanModelQueryDto {
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}
