import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CompanyService } from "./company.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { Roles } from "../auth/decorator/roles.decorator";
import { updateCompanyStatusDto } from "./dto/update-company-status.dto";


@Controller('api/v1/companies')
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
  async listAll() {
    return this.companyService.listAll();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: updateCompanyStatusDto,
    @Req() req: any
  ) {
    return this.companyService.updateStatus(
      id,
      dto.status,
      req.user
    )
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: any
  ) {
    return this.companyService.update(id, dto, req.user);
  }

  @Post(':id/regenerate-token')
  @Roles('admin')
  async regenerateToken(
    @Param('id') id: string,
    @Req() req: any
  ) {
    return this.companyService.regenerateToken(id, req.user);
  }
}