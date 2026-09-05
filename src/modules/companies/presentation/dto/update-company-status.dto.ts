import { Status } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCompanyStatusDto {
  @IsEnum(Status)
  status!: Status;
}
