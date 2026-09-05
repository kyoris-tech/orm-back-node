import { Module } from '@nestjs/common';
import { ResumesController } from './presentation/resumes.controller';
import { ResumesService } from './application/resumes.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { UploadService } from './application/upload.service';
import { ExtractorService } from './infrastructure/extractor/extractor.service';
import { OpenaiService } from './infrastructure/openai/openai.service';
import { ResumePdfService } from './infrastructure/pdf/resume-pdf.service';
import { PlansModule } from '../plans/plans.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';

@Module({
  imports: [PrismaModule, PlansModule, ExchangeRateModule],
  controllers: [ResumesController],
  providers: [
    ResumesService,
    UploadService,
    ExtractorService,
    OpenaiService,
    ResumePdfService,
  ],
  exports: [UploadService],
})
export class ResumesModule {}
