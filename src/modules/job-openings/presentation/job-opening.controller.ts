import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { JobOpeningService } from '../application/job-opening.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';
import { UpdateJobOpeningDto } from './dto/update-job-opening.dto';

@Controller('job-openings')
@UseGuards(JwtAuthGuard)
export class JobOpeningController {
  constructor(private readonly jobOpeningService: JobOpeningService) {}

  @Post()
  async create(
    @Body() dto: CreateJobOpeningDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.jobOpeningService.create(dto, currentUser);
  }

  @Get()
  async findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.jobOpeningService.findAll(currentUser, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.jobOpeningService.findOne(id, currentUser);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobOpeningDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.jobOpeningService.update(id, dto, currentUser);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.jobOpeningService.cancel(id, currentUser);
  }
}
