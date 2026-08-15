import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContractType, WorkModel } from '@prisma/client';

export class CreateJobOpeningDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(WorkModel)
  workModel: WorkModel;

  @IsEnum(ContractType)
  contractType: ContractType;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  differentials?: string[];
}
