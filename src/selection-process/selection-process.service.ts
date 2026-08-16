import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { CreateSelectionProcessDto } from './dto/create-selection-process.dto';
import { LinkJobOpeningDto } from './dto/link-job-opening.dto';
import { AddCandidatesDto } from './dto/add-candidates.dto';
import { ConcludeSelectionProcessDto } from './dto/conclude-selection-process.dto';

const jobOpeningSelect = { id: true, title: true, status: true };
const selectedResumeSelect = { id: true, fullName: true, dataJson: true };
const summaryInclude = {
  _count: { select: { candidates: true } },
  jobOpening: { select: jobOpeningSelect },
  selectedResume: { select: selectedResumeSelect },
};

@Injectable()
export class SelectionProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async create(dto: CreateSelectionProcessDto, user: any) {
    await this.planLimitsService.assertFeatureEnabled(user.companyId, 'selectionProcesses');

    const uniqueResumeIds = Array.from(new Set(dto.resumeIds));

    const resumes = await this.prisma.resume.findMany({
      where: {
        id: { in: uniqueResumeIds },
        companyId: user.companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (resumes.length === 0) {
      throw new NotFoundException(
        'Nenhum currículo válido foi encontrado para esta empresa',
      );
    }

    if (dto.jobOpeningId) {
      await this.assertJobOpeningBelongsToCompany(dto.jobOpeningId, user.companyId);
    }

    const process = await this.prisma.selectionProcess.create({
      data: {
        name: dto.name,
        companyId: user.companyId,
        createdById: user.userId,
        jobOpeningId: dto.jobOpeningId,
        candidates: {
          create: resumes.map((resume) => ({ resumeId: resume.id })),
        },
      },
      include: summaryInclude,
    });

    await this.auditLogService.create({
      entityType: 'SELECTION_PROCESS',
      entityId: process.id,
      action: 'CREATE',
      newValue: process.name,
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    return process;
  }

  async findAll(user: any) {
    return this.prisma.selectionProcess.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: summaryInclude,
    });
  }

  async findOne(id: string, user: any) {
    const process = await this.prisma.selectionProcess.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        candidates: {
          orderBy: { addedAt: 'desc' },
          include: {
            resume: true,
          },
        },
        jobOpening: { select: jobOpeningSelect },
        selectedResume: { select: selectedResumeSelect },
      },
    });

    if (!process) {
      throw new NotFoundException('Processo seletivo não encontrado');
    }

    return process;
  }

  async cancel(id: string, user: any) {
    const process = await this.prisma.selectionProcess.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!process) {
      throw new NotFoundException('Processo seletivo não encontrado');
    }

    if (process.status !== 'OPEN') {
      throw new BadRequestException('Este processo seletivo não está mais em andamento');
    }

    await this.prisma.selectionProcess.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await this.closeLinkedJobOpeningIfNoOpenProcesses(process.jobOpeningId, user);

    await this.auditLogService.create({
      entityType: 'SELECTION_PROCESS',
      entityId: process.id,
      action: 'CANCEL',
      oldValue: process.status,
      newValue: 'CANCELLED',
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    return this.getSummary(id);
  }

  async close(id: string, user: any) {
    const process = await this.prisma.selectionProcess.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!process) {
      throw new NotFoundException('Processo seletivo não encontrado');
    }

    if (process.status !== 'OPEN') {
      throw new BadRequestException('Este processo seletivo não está mais em andamento');
    }

    await this.prisma.selectionProcess.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    await this.closeLinkedJobOpeningIfNoOpenProcesses(process.jobOpeningId, user);

    await this.auditLogService.create({
      entityType: 'SELECTION_PROCESS',
      entityId: process.id,
      action: 'CLOSE',
      oldValue: process.status,
      newValue: 'CLOSED',
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    return this.getSummary(id);
  }

  async conclude(id: string, dto: ConcludeSelectionProcessDto, user: any) {
    const process = await this.prisma.selectionProcess.findFirst({
      where: { id, companyId: user.companyId },
      include: { candidates: { select: { resumeId: true } } },
    });

    if (!process) {
      throw new NotFoundException('Processo seletivo não encontrado');
    }

    if (process.status !== 'OPEN') {
      throw new BadRequestException('Este processo seletivo não está mais em andamento');
    }

    const isCandidateInProcess = process.candidates.some((candidate) => candidate.resumeId === dto.resumeId);

    if (!isCandidateInProcess) {
      throw new BadRequestException('O candidato selecionado não faz parte deste processo seletivo');
    }

    await this.prisma.selectionProcess.update({
      where: { id },
      data: { status: 'CONCLUDED', selectedResumeId: dto.resumeId, concludedAt: new Date() },
    });

    await this.closeLinkedJobOpeningIfNoOpenProcesses(process.jobOpeningId, user);

    await this.auditLogService.create({
      entityType: 'SELECTION_PROCESS',
      entityId: process.id,
      action: 'CONCLUDE',
      oldValue: process.status,
      newValue: 'CONCLUDED',
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    return this.getSummary(id);
  }

  async linkJobOpening(id: string, dto: LinkJobOpeningDto, user: any) {
    const process = await this.prisma.selectionProcess.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!process) {
      throw new NotFoundException('Processo seletivo não encontrado');
    }

    await this.assertJobOpeningBelongsToCompany(dto.jobOpeningId, user.companyId);

    return this.prisma.selectionProcess.update({
      where: { id },
      data: { jobOpeningId: dto.jobOpeningId },
      include: summaryInclude,
    });
  }

  async addCandidates(id: string, dto: AddCandidatesDto, user: any) {
    const process = await this.prisma.selectionProcess.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!process) {
      throw new NotFoundException('Processo seletivo não encontrado');
    }

    if (process.status !== 'OPEN') {
      throw new BadRequestException(
        'Não é possível adicionar candidatos a um processo que não está em andamento',
      );
    }

    const uniqueResumeIds = Array.from(new Set(dto.resumeIds));

    const resumes = await this.prisma.resume.findMany({
      where: {
        id: { in: uniqueResumeIds },
        companyId: user.companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (resumes.length === 0) {
      throw new NotFoundException(
        'Nenhum currículo válido foi encontrado para esta empresa',
      );
    }

    const existingCandidates = await this.prisma.selectionProcessCandidate.findMany({
      where: {
        selectionProcessId: id,
        resumeId: { in: resumes.map((resume) => resume.id) },
      },
      select: { resumeId: true },
    });

    const existingResumeIds = new Set(existingCandidates.map((candidate) => candidate.resumeId));
    const resumesToAdd = resumes.filter((resume) => !existingResumeIds.has(resume.id));

    if (resumesToAdd.length > 0) {
      await this.prisma.selectionProcessCandidate.createMany({
        data: resumesToAdd.map((resume) => ({
          selectionProcessId: id,
          resumeId: resume.id,
        })),
      });
    }

    return this.findOne(id, user);
  }

  private async getSummary(id: string) {
    return this.prisma.selectionProcess.findUniqueOrThrow({
      where: { id },
      include: summaryInclude,
    });
  }

  private async closeLinkedJobOpeningIfNoOpenProcesses(jobOpeningId: string | null, user: any) {
    if (!jobOpeningId) {
      return;
    }

    const jobOpening = await this.prisma.jobOpening.findUnique({
      where: { id: jobOpeningId },
      select: { status: true },
    });

    if (!jobOpening || jobOpening.status !== 'OPEN') {
      return;
    }

    const remainingOpenProcesses = await this.prisma.selectionProcess.count({
      where: { jobOpeningId, status: 'OPEN' },
    });

    if (remainingOpenProcesses === 0) {
      await this.prisma.jobOpening.update({
        where: { id: jobOpeningId },
        data: { status: 'CLOSED' },
      });

      await this.auditLogService.create({
        entityType: 'JOB_OPENING',
        entityId: jobOpeningId,
        action: 'AUTO_CLOSE',
        oldValue: 'OPEN',
        newValue: 'CLOSED',
        performedByUserId: user.userId,
        performedByName: `${user.email} (sem processos seletivos em aberto)`,
      });
    }
  }

  private async assertJobOpeningBelongsToCompany(jobOpeningId: string, companyId: string) {
    const jobOpening = await this.prisma.jobOpening.findFirst({
      where: { id: jobOpeningId, companyId },
      select: { id: true },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada para esta empresa');
    }
  }
}
