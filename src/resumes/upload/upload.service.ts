import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExtractorService } from '../extractor/extractor.service';
import { OpenaiService } from '../openai/openai.service';
import { randomUUID } from 'crypto';
import { bulkJobs } from '../bulk/bulk-jobs';

@Injectable()
export class UploadService {
  private readonly logger =
    new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractorService: ExtractorService,
    private readonly openaiService: OpenaiService,
  ) { }

  async upload(file: any, user: any) {
    const start = Date.now();

    if (!file) {
      throw new BadRequestException(
        'Arquivo obrigatório',
      );
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato não suportado. Envie PDF ou DOCX.',
      );
    }

    const extractedText =
      await this.extractorService.extractText(
        file.buffer,
        file.mimetype,
      );

    const {
      data: aiResult,
      costBrl,
    } =
      await this.openaiService.analyseResume(
        extractedText,
      );

    const processingMs = Date.now() - start;

    const savedResume =
      await this.prisma.resume.create({
        data: {
          fileName: file.originalname,
          companyId: user.companyId,
          createdById: user.id,

          fullName: aiResult.fullName,
          email: aiResult.email,
          confidence: aiResult.confidence,

          processingMs,
          costBrl,

          dataJson: aiResult,
        },
      });

    return {
      message: 'Texto extraído com sucesso',
      resume: savedResume,
      extractedText,
    };
  }

  async uploadBulk(
    files: any[],
    user: any,
  ) {
    if (!files || !files.length) {
      throw new BadRequestException(
        'Nenhum arquivo enviado',
      );
    }

    const results: any[] = [];

    for (const file of files) {
      try {
        const result =
          await this.upload(file, user);

        results.push({
          fileName: file.originalname,
          success: true,
          result,
        });
      } catch (error: any) {
        results.push({
          fileName: file.originalname,
          success: false,
          error:
            error.message ||
            'Erro ao processar arquivo',
        });
      }
    }

    return {
      total: files.length,
      processed: results.length,
      results,
    };
  }

  async startBulkUpload(
    files: any[],
    user: any,
  ) {
    if (!files || !files.length) {
      throw new BadRequestException(
        'Nenhum arquivo enviado',
      );
    }

    const jobId = randomUUID();

    bulkJobs[jobId] = {
      total: files.length,
      processed: 0,
      processing: files.length,
      errors: 0,
      done: false,
    };

    this.logger.log(
      `Iniciando bulk upload | Job=${jobId} | Total=${files.length}`,
    );

    this.processBulkFiles(
      jobId,
      files,
      user,
    );

    return {
      jobId,
      total: files.length,
    };
  }

  private async processBulkFiles(
    jobId: string,
    files: any[],
    user: any,
  ) {
    for (const file of files) {
      try {
        await this.upload(file, user);

        bulkJobs[jobId].processed += 1;
      } catch (error: any) {
        bulkJobs[jobId].errors += 1;

        this.logger.error(
          `Erro no bulk upload | Job=${jobId} | File=${file.originalname}`,
          error?.stack || error?.message,
        );
      } finally {
        bulkJobs[jobId].processing -= 1;
      }
    }

    bulkJobs[jobId].done = true;

    this.logger.log(
      `Bulk upload finalizado | Job=${jobId}`,
    );
  }

  getBulkStatus(jobId: string) {
    const job = bulkJobs[jobId];

    if (!job) {
      throw new NotFoundException(
        'Job não encontrado',
      );
    }

    return job;
  }
}