import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  buildPaginatedResult,
  parsePagination,
} from '../../../common/pagination/pagination';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { CreateResumeDto } from '../presentation/dto/create-resume.dto';
import { SearchResumeDto } from '../presentation/dto/search-resume.dto';
import type {
  ResumeData,
  ResumeExperience,
  ResumeSearchableFields,
} from '../domain/resume-data';

const RECENT_RESUMES_LIMIT = 3;
const FULL_MATCH_SCORE = 100;

const RESUME_LIST_INCLUDE = {
  company: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.ResumeInclude;

type ResumeWithRelations = Prisma.ResumeGetPayload<{
  include: typeof RESUME_LIST_INCLUDE;
}>;

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateResumeDto, user: AuthenticatedUser) {
    return this.prisma.resume.create({
      data: {
        ...dto,
        companyId: user.companyId,
        createdById: user.userId,
      },
    });
  }

  async getRecentResumes(companyId: string) {
    return this.prisma.resume.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: RECENT_RESUMES_LIMIT,
      select: {
        id: true,
        fileName: true,
        fullName: true,
        email: true,
        confidence: true,
        processingMs: true,
        costBrl: true,
        createdAt: true,
        dataJson: true,
      },
    });
  }

  async findAllWithCompatibility(
    user: AuthenticatedUser,
    query: SearchResumeDto,
  ) {
    const { page, pageSize, skip } = parsePagination(
      query.page,
      query.pageSize,
    );

    const where: Prisma.ResumeWhereInput = {
      deletedAt: null,
      ...(user.role === 'admin' ? {} : { companyId: user.companyId }),
      ...(query.confidenceMin
        ? { confidence: { gte: Number(query.confidenceMin) } }
        : {}),
    };

    const resumes = await this.prisma.resume.findMany({
      where,
      include: RESUME_LIST_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const rankedResumes = resumes
      .map((resume) => ({
        ...resume,
        compatibility: this.calculateMatchScore(resume, query),
      }))
      .sort((first, second) => second.compatibility - first.compatibility);

    const paginatedData = rankedResumes.slice(skip, skip + pageSize);

    return buildPaginatedResult(
      paginatedData,
      rankedResumes.length,
      page,
      pageSize,
    );
  }

  async softDeleteResume(
    id: string,
    companyId: string,
    userId: string,
    performedByName: string,
  ) {
    const resume = await this.prisma.resume.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!resume) {
      throw new NotFoundException('Currículo não encontrado');
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'resume',
        entityId: id,
        action: 'SOFT_DELETE',
        oldValue: JSON.stringify(resume),
        newValue: null,
        performedByUserId: userId,
        performedByName,
      },
    });

    return this.prisma.resume.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDeleteResume(id: string, userId: string, performedByName: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException('Currículo não encontrado');
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'resume',
        entityId: id,
        action: 'HARD_DELETE',
        oldValue: JSON.stringify(resume),
        newValue: null,
        performedByUserId: userId,
        performedByName,
      },
    });

    return this.prisma.resume.delete({
      where: { id },
    });
  }

  async restoreResume(
    id: string,
    companyId: string,
    userId: string,
    performedByName: string,
  ) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, companyId, deletedAt: { not: null } },
    });

    if (!resume) {
      throw new NotFoundException('Currículo não encontrado');
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'resume',
        entityId: id,
        action: 'RESTORE',
        oldValue: JSON.stringify(resume),
        newValue: JSON.stringify({ deletedAt: null }),
        performedByUserId: userId,
        performedByName,
      },
    });

    return this.prisma.resume.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async downloadResumePdf(
    id: string,
    companyId: string,
    userId: string,
    performedByName: string,
  ) {
    const resume = await this.prisma.resume.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!resume) {
      throw new NotFoundException('Currículo não encontrado');
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'resume',
        entityId: id,
        action: 'DOWNLOAD',
        oldValue: null,
        newValue: JSON.stringify({ action: 'PDF_DOWNLOAD' }),
        performedByUserId: userId,
        performedByName,
      },
    });

    return resume;
  }

  private parseFilterTerms(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .toLowerCase()
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean);
  }

  private countMatchingTerms(terms: string[], haystack: string): number {
    return terms.filter((term) => haystack.includes(term)).length;
  }

  private buildSearchableFields(
    resume: ResumeWithRelations,
  ): ResumeSearchableFields {
    const data = (resume.dataJson ?? {}) as ResumeData;
    const experience: ResumeExperience[] = data.experience ?? [];

    return {
      query:
        `${resume.fullName ?? ''} ${resume.email ?? ''} ${JSON.stringify(data)}`.toLowerCase(),
      skills: (data.skills ?? []).join(' ').toLowerCase(),
      title: [data.role ?? '', ...experience.map((item) => item.role ?? '')]
        .join(' ')
        .toLowerCase(),
      city: `${data.location?.city ?? ''} ${data.location?.state ?? ''}`.toLowerCase(),
      degree: JSON.stringify(data.education ?? []).toLowerCase(),
      languages: JSON.stringify(data.language ?? []).toLowerCase(),
    };
  }

  private calculateMatchScore(
    resume: ResumeWithRelations,
    filters: SearchResumeDto,
  ): number {
    const fields = this.buildSearchableFields(resume);

    const filterEntries: [string | undefined, string][] = [
      [filters.query, fields.query],
      [filters.skills, fields.skills],
      [filters.title, fields.title],
      [filters.city, fields.city],
      [filters.degree, fields.degree],
      [filters.languages, fields.languages],
    ];

    let matchedTerms = 0;
    let requestedTerms = 0;

    for (const [rawValue, haystack] of filterEntries) {
      const terms = this.parseFilterTerms(rawValue);

      requestedTerms += terms.length;
      matchedTerms += this.countMatchingTerms(terms, haystack);
    }

    if (requestedTerms === 0) {
      return FULL_MATCH_SCORE;
    }

    return Math.round((matchedTerms / requestedTerms) * FULL_MATCH_SCORE);
  }
}
