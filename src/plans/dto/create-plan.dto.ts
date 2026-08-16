import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ALL_PLAN_FEATURES, type PlanFeature } from '../plan-limits';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxResumesPerMonth?: number | null;

  @IsOptional()
  @IsArray()
  @IsIn(ALL_PLAN_FEATURES, { each: true })
  features?: PlanFeature[];
}
