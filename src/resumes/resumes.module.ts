import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from './upload/upload.service';
import { ExtractorService } from './extractor/extractor.service';
import { OpenaiService } from './openai/openai.service';
import { ResumePdfService } from './resume-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResumesController],
  providers: [
    ResumesService,
    UploadService,
    ExtractorService,
    OpenaiService,
    ResumePdfService
  ],
  exports: [UploadService],
})
export class ResumesModule {}