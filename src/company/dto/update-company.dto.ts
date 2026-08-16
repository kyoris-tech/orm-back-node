import { IsString, MinLength } from "class-validator";


export class UpdateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
