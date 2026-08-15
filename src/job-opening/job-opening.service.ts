import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';

@Injectable()
export class JobOpeningService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobOpeningDto, user: any) {
    return this.prisma.jobOpening.create({
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
}
