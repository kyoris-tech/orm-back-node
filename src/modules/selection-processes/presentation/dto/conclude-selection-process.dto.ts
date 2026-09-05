import { IsNotEmpty, IsString } from 'class-validator';

export class ConcludeSelectionProcessDto {
  @IsString()
  @IsNotEmpty()
  resumeId!: string;
}
