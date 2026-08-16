import { IsNotEmpty, IsString } from "class-validator";


export class UpdateCompanyPlanDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;
}
