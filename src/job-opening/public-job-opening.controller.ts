import { Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JobOpeningService } from './job-opening.service';
import { UploadService } from '../resumes/upload/upload.service';
import { SelectionProcessService } from '../selection-process/selection-process.service';
import { PublicApplyThrottlerGuard } from './guards/public-apply-throttler.guard';

const APPLY_RATE_LIMIT = 30;
const APPLY_RATE_TTL_MS = 30 * 60 * 1000;
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

@Controller('api/v1/public/job-openings')
export class PublicJobOpeningController {
  constructor(
    private readonly jobOpeningService: JobOpeningService,
    private readonly uploadService: UploadService,
    private readonly selectionProcessService: SelectionProcessService,
  ) {}

  @Get()
  async findAllOpen() {
    return this.jobOpeningService.findAllPublicOpen();
  }

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    return this.jobOpeningService.findPublicByCode(code);
  }

  @Post(':code/apply')
  @UseGuards(PublicApplyThrottlerGuard)
  @Throttle({ default: { limit: APPLY_RATE_LIMIT, ttl: APPLY_RATE_TTL_MS } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }))
  async apply(@Param('code') code: string, @UploadedFile() file: any) {
    const jobOpening = await this.jobOpeningService.getOpenJobOpeningForApply(code);
    const result = await this.uploadService.upload(file, { companyId: jobOpening.companyId });

    await this.selectionProcessService.attachPublicApplication(jobOpening, result.resume);

    return result;
  }
}
