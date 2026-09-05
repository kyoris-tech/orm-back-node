import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { PlanLimitsService } from '../../plans/application/plan-limits.service';
import { ExtractorService } from '../infrastructure/extractor/extractor.service';
import { OpenaiService } from '../infrastructure/openai/openai.service';
import {
  bulkJobs,
  scheduleBulkJobCleanup,
} from '../infrastructure/bulk/bulk-job.store';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import type { UploadActor } from '../domain/upload-actor';
import type {
  BulkUploadItemResult,
  BulkUploadSummary,
} from '../domain/bulk-upload';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractorService: ExtractorService,
    private readonly openaiService: OpenaiService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async upload(file: Express.Multer.File, actor: UploadActor) {
    const start = Date.now();

    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato não suportado. Envie PDF ou DOCX.',
      );
    }

    await this.planLimitsService.assertCanProcessResume(actor.companyId);

    const extractedText = await this.extractorService.extractText(
      file.buffer,
      file.mimetype,
    );

    const { data: aiResult, costBrl } =
      await this.openaiService.analyseResume(extractedText);

    const processingMs = Date.now() - start;

    const savedResume = await this.prisma.resume.create({
      data: {
        fileName: file.originalname,
        companyId: actor.companyId,
        createdById: actor.userId ?? null,

        fullName: aiResult.fullName,
        email: aiResult.email,
        confidence: aiResult.confidence,

        processingMs,
        costBrl,

        dataJson: aiResult as unknown as Prisma.InputJsonObject,
      },
    });

    return {
      message: 'Texto extraído com sucesso',
      resume: savedResume,
      extractedText,
    };
  }

  async uploadBulk(
    files: Express.Multer.File[],
    actor: UploadActor,
  ): Promise<BulkUploadSummary> {
    if (!files || !files.length) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const results: BulkUploadItemResult[] = [];

    for (const file of files) {
      try {
        const result = await this.upload(file, actor);

        results.push({
          fileName: file.originalname,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          fileName: file.originalname,
          success: false,
          error: this.describeError(error),
        });
      }
    }

    return {
      total: files.length,
      processed: results.length,
      results,
    };
  }

  startBulkUpload(files: Express.Multer.File[], user: AuthenticatedUser) {
    if (!files || !files.length) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const jobId = randomUUID();

    bulkJobs[jobId] = {
      ownerId: user.userId,
      companyId: user.companyId,
      total: files.length,
      processed: 0,
      processing: files.length,
      errors: 0,
      done: false,
    };

    this.logger.log(
      `Iniciando bulk upload | Job=${jobId} | Total=${files.length}`,
    );

    void this.processBulkFiles(jobId, files, user);

    return {
      jobId,
      total: files.length,
    };
  }

  getBulkStatus(jobId: string, user: AuthenticatedUser) {
    const job = bulkJobs[jobId];

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    if (job.companyId !== user.companyId || job.ownerId !== user.userId) {
      throw new ForbiddenException('Sem permissão para acessar este job');
    }

    return {
      total: job.total,
      processed: job.processed,
      processing: job.processing,
      errors: job.errors,
      done: job.done,
    };
  }

  private async processBulkFiles(
    jobId: string,
    files: Express.Multer.File[],
    actor: UploadActor,
  ): Promise<void> {
    for (const file of files) {
      try {
        await this.upload(file, actor);

        bulkJobs[jobId].processed += 1;
      } catch (error) {
        bulkJobs[jobId].errors += 1;

        this.logger.error(
          `Erro no bulk upload | Job=${jobId} | File=${file.originalname}`,
          error instanceof Error ? error.stack : this.describeError(error),
        );
      } finally {
        bulkJobs[jobId].processing -= 1;
      }
    }

    bulkJobs[jobId].done = true;

    this.logger.log(`Bulk upload finalizado | Job=${jobId}`);

    scheduleBulkJobCleanup(jobId);
  }

  private describeError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Erro ao processar arquivo';
  }
}
