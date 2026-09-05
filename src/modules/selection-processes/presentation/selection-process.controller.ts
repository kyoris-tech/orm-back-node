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
import { SelectionProcessService } from '../application/selection-process.service';
import { CreateSelectionProcessDto } from './dto/create-selection-process.dto';
import { LinkJobOpeningDto } from './dto/link-job-opening.dto';
import { AddCandidatesDto } from './dto/add-candidates.dto';
import { ConcludeSelectionProcessDto } from './dto/conclude-selection-process.dto';
import { LinkCandidateToJobOpeningDto } from './dto/link-candidate-to-job-opening.dto';

@Controller('selection-processes')
@UseGuards(JwtAuthGuard)
export class SelectionProcessController {
  constructor(
    private readonly selectionProcessService: SelectionProcessService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateSelectionProcessDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.create(dto, currentUser);
  }

  @Post('link-candidate')
  async linkCandidateToJobOpening(
    @Body() dto: LinkCandidateToJobOpeningDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.linkCandidateToJobOpening(
      dto,
      currentUser,
    );
  }

  @Get()
  async findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.selectionProcessService.findAll(currentUser, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.findOne(id, currentUser);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.cancel(id, currentUser);
  }

  @Patch(':id/close')
  async close(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.close(id, currentUser);
  }

  @Patch(':id/conclude')
  async conclude(
    @Param('id') id: string,
    @Body() dto: ConcludeSelectionProcessDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.conclude(id, dto, currentUser);
  }

  @Patch(':id/job-opening')
  async linkJobOpening(
    @Param('id') id: string,
    @Body() dto: LinkJobOpeningDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.linkJobOpening(id, dto, currentUser);
  }

  @Post(':id/candidates')
  async addCandidates(
    @Param('id') id: string,
    @Body() dto: AddCandidatesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.selectionProcessService.addCandidates(id, dto, currentUser);
  }
}
