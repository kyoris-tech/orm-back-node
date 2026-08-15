import { ArrayMinSize, ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSelectionProcessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  resumeIds: string[];

  @IsOptional()
  @IsString()
  jobOpeningId?: string;
}
