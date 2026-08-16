import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from "class-validator";


export class UpdateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cnpj?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay?: number;
}
