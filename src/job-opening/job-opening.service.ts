import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';

const PUBLIC_CODE_LENGTH = 10;
const MAX_PUBLIC_CODE_ATTEMPTS = 5;

function generatePublicCode(): string {
  return randomBytes(8).toString('base64url').slice(0, PUBLIC_CODE_LENGTH);
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class JobOpeningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async create(dto: CreateJobOpeningDto, user: any) {
    await this.planLimitsService.assertFeatureEnabled(user.companyId, 'jobOpenings');

    const jobOpening = await this.createWithUniquePublicCode(dto, user);

    await this.auditLogService.create({
      entityType: 'JOB_OPENING',
      entityId: jobOpening.id,
      action: 'CREATE',
      newValue: jobOpening.title,
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    return jobOpening;
  }

  async findAll(user: any) {
    return this.prisma.jobOpening.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { selectionProcesses: true } },
      },
    });
  }

  async findOne(id: string, user: any) {
    const jobOpening = await this.prisma.jobOpening.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        selectionProcesses: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { candidates: true } },
          },
        },
      },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada');
    }

    return jobOpening;
  }

  async findAllPublicOpen() {
    const jobOpenings = await this.prisma.jobOpening.findMany({
      where: { status: 'OPEN', company: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      select: {
        publicCode: true,
        title: true,
        workModel: true,
        contractType: true,
        salaryRange: true,
        requirements: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    });

    return jobOpenings.map(({ company, ...rest }) => ({ ...rest, companyName: company.name }));
  }

  async findPublicByCode(code: string) {
    const jobOpening = await this.prisma.jobOpening.findUnique({
      where: { publicCode: code },
      select: {
        title: true,
        workModel: true,
        contractType: true,
        salaryRange: true,
        requirements: true,
        differentials: true,
        status: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada');
    }

    const { company, ...rest } = jobOpening;

    return { ...rest, companyName: company.name };
  }

  async cancel(id: string, user: any) {
    const jobOpening = await this.prisma.jobOpening.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada');
    }

    if (jobOpening.status !== 'OPEN') {
      throw new BadRequestException('Esta vaga não está mais em aberto');
    }

    const openProcesses = await this.prisma.selectionProcess.findMany({
      where: { jobOpeningId: id, status: 'OPEN' },
      select: { id: true, name: true },
    });

    await this.prisma.$transaction([
      this.prisma.jobOpening.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      }),
      ...openProcesses.map((process) =>
        this.prisma.selectionProcess.update({
          where: { id: process.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        }),
      ),
    ]);

    await this.auditLogService.create({
      entityType: 'JOB_OPENING',
      entityId: jobOpening.id,
      action: 'CANCEL',
      oldValue: jobOpening.status,
      newValue: 'CANCELLED',
      performedByUserId: user.userId,
      performedByName: user.email,
    });

    for (const process of openProcesses) {
      await this.auditLogService.create({
        entityType: 'SELECTION_PROCESS',
        entityId: process.id,
        action: 'CANCEL',
        oldValue: 'OPEN',
        newValue: 'CANCELLED',
        performedByUserId: user.userId,
        performedByName: `${user.email} (vaga cancelada)`,
      });
    }

    return this.findOne(id, user);
  }

  async getCompanyIdForOpenPublicCode(code: string) {
    const jobOpening = await this.prisma.jobOpening.findUnique({
      where: { publicCode: code },
      select: { companyId: true, status: true, company: { select: { status: true } } },
    });

    if (!jobOpening) {
      throw new NotFoundException('Vaga não encontrada');
    }

    if (jobOpening.status !== 'OPEN' || jobOpening.company.status !== 'ACTIVE') {
      throw new BadRequestException('Esta vaga não está mais recebendo candidaturas');
    }

    return jobOpening.companyId;
  }

  private async createWithUniquePublicCode(dto: CreateJobOpeningDto, user: any) {
    for (let attempt = 1; attempt <= MAX_PUBLIC_CODE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.jobOpening.create({
          data: {
            title: dto.title,
            workModel: dto.workModel,
            contractType: dto.contractType,
            salaryRange: dto.salaryRange,
            requirements: dto.requirements ?? [],
            differentials: dto.differentials ?? [],
            companyId: user.companyId,
            createdById: user.userId,
            publicCode: generatePublicCode(),
          },
        });
      } catch (error) {
        if (!isUniqueConstraintViolation(error) || attempt === MAX_PUBLIC_CODE_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw new ConflictException('Não foi possível gerar um código público único para a vaga');
  }
}
