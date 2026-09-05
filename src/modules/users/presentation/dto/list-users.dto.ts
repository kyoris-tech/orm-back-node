import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ListUsersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;
}
