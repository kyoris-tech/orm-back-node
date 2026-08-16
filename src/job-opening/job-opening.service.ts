import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';

@Injectable()
export class JobOpeningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateJobOpeningDto, user: any) {
    const jobOpening = await this.prisma.jobOpening.create({
      data: {
        title: dto.title,
        workModel: dto.workModel,
        contractType: dto.contractType,
        salaryRange: dto.salaryRange,
        requirements: dto.requirements ?? [],
        differentials: dto.differentials ?? [],
        companyId: user.companyId,
        createdById: user.userId,
      },
    });

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
}
