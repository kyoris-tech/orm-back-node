import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from "class-validator";


export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  cnpj!: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;

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
