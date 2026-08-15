import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelectionProcessService } from './selection-process.service';
import { CreateSelectionProcessDto } from './dto/create-selection-process.dto';
import { LinkJobOpeningDto } from './dto/link-job-opening.dto';

@Controller('api/v1/selection-processes')
@UseGuards(JwtAuthGuard)
export class SelectionProcessController {
  constructor(private readonly selectionProcessService: SelectionProcessService) {}

  @Post()
  async create(@Body() dto: CreateSelectionProcessDto, @Req() req) {
    return this.selectionProcessService.create(dto, req.user);
  }

  @Get()
  async findAll(@Req() req) {
    return this.selectionProcessService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.selectionProcessService.findOne(id, req.user);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    return this.selectionProcessService.cancel(id, req.user);
  }

  @Patch(':id/job-opening')
  async linkJobOpening(@Param('id') id: string, @Body() dto: LinkJobOpeningDto, @Req() req) {
    return this.selectionProcessService.linkJobOpening(id, dto, req.user);
  }
}
