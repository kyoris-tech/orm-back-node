import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSelectionProcessDto } from './dto/create-selection-process.dto';
import { LinkJobOpeningDto } from './dto/link-job-opening.dto';

const jobOpeningSelect = { id: true, title: true, status: true };

@Injectable()
export class SelectionProcessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSelectionProcessDto, user: any) {
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

    return this.prisma.selectionProcess.create({
      data: {
        name: dto.name,
        companyId: user.companyId,
        createdById: user.userId,
        jobOpeningId: dto.jobOpeningId,
        candidates: {
          create: resumes.map((resume) => ({ resumeId: resume.id })),
        },
      },
      include: {
        _count: { select: { candidates: true } },
        jobOpening: { select: jobOpeningSelect },
      },
    });
  }

  async findAll(user: any) {
    return this.prisma.selectionProcess.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { candidates: true } },
        jobOpening: { select: jobOpeningSelect },
      },
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

    if (process.status === 'CLOSED') {
      throw new BadRequestException('Este processo seletivo já está cancelado');
    }

    return this.prisma.selectionProcess.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: {
        _count: { select: { candidates: true } },
        jobOpening: { select: jobOpeningSelect },
      },
    });
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
      include: {
        _count: { select: { candidates: true } },
        jobOpening: { select: jobOpeningSelect },
      },
    });
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
