import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobOpeningService } from './job-opening.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';
import { UpdateJobOpeningDto } from './dto/update-job-opening.dto';

@Controller('api/v1/job-openings')
@UseGuards(JwtAuthGuard)
export class JobOpeningController {
  constructor(private readonly jobOpeningService: JobOpeningService) {}

  @Post()
  async create(@Body() dto: CreateJobOpeningDto, @Req() req) {
    return this.jobOpeningService.create(dto, req.user);
  }

  @Get()
  async findAll(@Req() req) {
    return this.jobOpeningService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.jobOpeningService.findOne(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateJobOpeningDto, @Req() req) {
    return this.jobOpeningService.update(id, dto, req.user);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    return this.jobOpeningService.cancel(id, req.user);
  }
}
