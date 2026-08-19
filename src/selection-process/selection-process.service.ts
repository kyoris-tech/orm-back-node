import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { CreateSelectionProcessDto } from './dto/create-selection-process.dto';
import { LinkJobOpeningDto } from './dto/link-job-opening.dto';
import { AddCandidatesDto } from './dto/add-candidates.dto';
import { ConcludeSelectionProcessDto } from './dto/conclude-selection-process.dto';
import { LinkCandidateToJobOpeningDto } from './dto/link-candidate-to-job-opening.dto';

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
      select: { id: true, dataJson: true },
    });

    if (resumes.length === 0) {
      throw new NotFoundException(
        'Nenhum currículo válido foi encontrado para esta empresa',
      );
    }

    const jobOpening = dto.jobOpeningId
      ? await this.assertJobOpeningBelongsToCompany(dto.jobOpeningId, user.companyId)
      : null;

    const process = await this.prisma.selectionProcess.create({
      data: {
        name: dto.name,
        companyId: user.companyId,
        createdById: user.userId,
        jobOpeningId: dto.jobOpeningId,
        candidates: {
          create: resumes.map((resume) => ({
            resumeId: resume.id,
            matchScore: jobOpening ? this.calculateJobMatchScore(resume, jobOpening) : null,
          })),
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
      include: { jobOpening: { select: { requirements: true, differentials: true } } },
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
      select: { id: true, dataJson: true },
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
          matchScore: process.jobOpening ? this.calculateJobMatchScore(resume, process.jobOpening) : null,
        })),
      });
    }

    return this.findOne(id, user);
  }

  async attachPublicApplication(
    jobOpening: { id: string; title: string; requirements: string[]; differentials: string[]; companyId: string },
    resume: { id: string; dataJson: any },
  ) {
    let process = await this.prisma.selectionProcess.findFirst({
      where: { jobOpeningId: jobOpening.id, status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
    });

    if (!process) {
      process = await this.prisma.selectionProcess.create({
        data: {
          name: `Candidaturas — ${jobOpening.title}`,
          companyId: jobOpening.companyId,
          jobOpeningId: jobOpening.id,
        },
      });
    }

    await this.prisma.selectionProcessCandidate.upsert({
      where: { selectionProcessId_resumeId: { selectionProcessId: process.id, resumeId: resume.id } },
      create: {
        selectionProcessId: process.id,
        resumeId: resume.id,
        matchScore: this.calculateJobMatchScore(resume, jobOpening),
      },
      update: {},
    });

    return process;
  }

  async linkCandidateToJobOpening(dto: LinkCandidateToJobOpeningDto, user: any) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: dto.resumeId, companyId: user.companyId, deletedAt: null },
      select: { id: true, fullName: true, dataJson: true },
    });

    if (!resume) {
      throw new NotFoundException('Currículo não encontrado');
    }

    const jobOpening = await this.prisma.jobOpening.findFirst({
      where: { id: dto.jobOpeningId, companyId: user.companyId },
      select: { id: true, title: true, requirements: true, differentials: true, companyId: true, status: true },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada');
    }

    if (jobOpening.status !== 'OPEN') {
      throw new BadRequestException('Esta vaga não está mais em aberto');
    }

    const process = await this.attachPublicApplication(jobOpening, resume);

    await this.auditLogService.create({
      entityType: 'SELECTION_PROCESS',
      entityId: process.id,
      action: 'ADD_CANDIDATE',
      newValue: resume.fullName ?? resume.id,
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    return this.findOne(process.id, user);
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
      select: { id: true, requirements: true, differentials: true },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada para esta empresa');
    }

    return jobOpening;
  }

  private tokenize(text?: string): string[] {
    if (!text) return [];
    return text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  }

  private buildResumeSearchableText(resume: { dataJson: any }): string {
    const data = resume.dataJson || {};

    const experienceText = (data.experience || [])
      .map((experience: any) => `${experience.role || ''} ${(experience.description || []).join(' ')}`)
      .join(' ');

    return `
      ${(data.skills || []).join(' ')}
      ${data.role || ''}
      ${data.summary || ''}
      ${data.qualifications || ''}
      ${(data.courses || []).join(' ')}
      ${experienceText}
    `.toLowerCase();
  }

  private calculateJobMatchScore(
    resume: { dataJson: any },
    jobOpening: { requirements: string[]; differentials: string[] },
  ): number | null {
    const criteria = [...jobOpening.requirements, ...jobOpening.differentials];

    if (criteria.length === 0) {
      return null;
    }

    const searchableText = this.buildResumeSearchableText(resume);

    const matchedCriteria = criteria.filter((criterion) => {
      const tokens = this.tokenize(criterion);

      if (tokens.length === 0) {
        return false;
      }

      const hits = tokens.filter((token) => searchableText.includes(token)).length;

      return hits / tokens.length >= 0.5;
    }).length;

    return Math.round((matchedCriteria / criteria.length) * 100);
  }
}
