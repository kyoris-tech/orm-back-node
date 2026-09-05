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
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { CompanyService } from '../application/company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { UpdateCompanyPlanDto } from './dto/update-company-plan.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Get()
  @Roles('admin')
  async listAll(@Query() query: PaginationQueryDto) {
    return this.companyService.listAll(query);
  }

  @Get('me/plan')
  async getMyPlan(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.companyService.getPlanUsage(currentUser.companyId);
  }

  @Patch(':id/plan')
  @Roles('admin')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyPlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.companyService.updatePlan(id, dto.planId, currentUser);
  }

  @Patch(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.companyService.updateStatus(id, dto.status, currentUser);
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.companyService.update(id, dto, currentUser);
  }

  @Post(':id/regenerate-token')
  @Roles('admin')
  async regenerateToken(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.companyService.regenerateToken(id, currentUser);
  }
}
