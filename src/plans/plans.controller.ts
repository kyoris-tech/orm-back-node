import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('api/v1/admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async listAll() {
    return this.plansService.listAll();
  }

  @Post()
  async create(@Body() dto: CreatePlanDto, @Req() req: any) {
    return this.plansService.create(dto, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto, @Req() req: any) {
    return this.plansService.update(id, dto, req.user);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.plansService.delete(id, req.user);
  }
}
