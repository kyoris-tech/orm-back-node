import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { PlansService } from '../application/plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async listAll(@Query() query: PaginationQueryDto) {
    return this.plansService.listAll(query);
  }

  @Post()
  async create(
    @Body() dto: CreatePlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.plansService.create(dto, currentUser);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.plansService.update(id, dto, currentUser);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.plansService.delete(id, currentUser);
  }
}
