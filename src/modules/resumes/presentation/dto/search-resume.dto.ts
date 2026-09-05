import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class SearchResumeDto extends PaginationQueryDto {
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
}
