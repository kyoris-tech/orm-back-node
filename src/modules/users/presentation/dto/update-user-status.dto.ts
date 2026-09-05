import { IsEnum } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(Status)
  status!: Status;
}
