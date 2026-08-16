import { IsNumberString, IsOptional } from 'class-validator';

export class SearchResumeDto {
  @IsOptional()
  query?: string;

  @IsOptional()
  skills?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  city?: string;

  @IsOptional()
  degree?: string;

  @IsOptional()
  languages?: string;

  @IsOptional()
  confidenceMin?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;
}