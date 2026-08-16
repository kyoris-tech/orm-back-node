import { ArrayMinSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AddCandidatesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  resumeIds: string[];
}
