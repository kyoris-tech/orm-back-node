import { IsEmail, IsIn, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsUUID()
  companyId!: string;

  @IsIn(['admin', 'mod', 'recruiter'])
  role!: 'admin' | 'mod' | 'recruiter';
}
