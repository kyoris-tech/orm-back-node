import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { ListResumeDto } from './dto/list-resume.dto';
import { SearchResumeDto } from './dto/search-resume.dto';

const MAX_PAGE_SIZE = 2000;
const DEFAULT_PAGE_SIZE = 10;

function parsePagination(rawPage?: string | number, rawPageSize?: string | number) {
  const page = Math.max(1, Math.trunc(Number(rawPage)) || 1);
  const requestedPageSize = Math.trunc(Number(rawPageSize)) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, requestedPageSize), MAX_PAGE_SIZE);

  return { page, pageSize, skip: (page - 1) * pageSize };
}

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(dto: CreateResumeDto, user: any) {
    return this.prisma.resume.create({
      data: {
        ...dto,
        companyId: user.companyId,
        createdById: user.id,
      },
    });
  }

  async findAll(user: any, query: ListResumeDto) {
    const isAdmin = user.role?.name === 'admin';

    const { page, pageSize, skip } = parsePagination(query.page, query.pageSize);

    const where: any = {
      deletedAt: null,
    };

    if (!isAdmin) {
      where.companyId = user.companyId;
    }

    if (query.fullName) {
      where.fullName = {
        contains: query.fullName,
        mode: 'insensitive',
      };
    }

    if (query.email) {
      where.email = {
        contains: query.email,
        mode: 'insensitive',
      };
    }

    if (query.confidenceMin) {
      where.confidence = {
        gte: Number(query.confidenceMin),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.resume.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          company: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      this.prisma.resume.count({
        where,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getRecentResumes(companyId: string) {
    return this.prisma.resume.findMany({
      where: {
        companyId,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3,
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
    })
  }

  async softDeleteResume(id: string, companyId: string, userId: string, userName: string) {
    const resume = await this.prisma.resume.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null
      },
    })

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
        performedByName: userName,
      },
    });

    return this.prisma.resume.update({
      where: {
        id
      },
      data: {
        deletedAt: new Date()
      }
    })
  }

  async hardDeleteResume(id: string, userId: string, userName: string) {
    const resume = await this.prisma.resume.findUnique({
      where: {
        id,
      }
    })

    if (!resume) {
      throw new NotFoundException('Currículo não encontrado')
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'resume',
        entityId: id,
        action: 'HARD_DELETE',
        oldValue: JSON.stringify(resume),
        newValue: null,
        performedByUserId: userId,
        performedByName: userName,
      },
    });

    return this.prisma.resume.delete({
      where: {
        id,
      }
    })
  }

  async restoreResume(
    id: string,
    companyId: string,
    userId: string,
    userName: string
  ) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, companyId, deletedAt: { not: null } }
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
        newValue: JSON.stringify({
          deletedAt: null,
        }),
        performedByUserId: userId,
        performedByName: userName,
      },
    });

    return this.prisma.resume.update({
      where: {
        id,
      },
      data: {
        deletedAt: null,
      },
    });
  }

  async downloadResumePdf(
    id: string,
    companyId: string,
    userId: string,
    userName: string,
  ) {
    const resume = await this.prisma.resume.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!resume) {
      throw new NotFoundException(
        'Currículo não encontrado',
      );
    }

    await this.prisma.auditLog.create({
      data: {
        entityType: 'resume',
        entityId: id,
        action: 'DOWNLOAD',
        oldValue: null,
        newValue: JSON.stringify({
          action: 'PDF_DOWNLOAD',
        }),
        performedByUserId: userId,
        performedByName: userName,
      },
    });

    return resume;
  }

  private tokenize(text?: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  }

  private calculateMatchScore(
    resume: any,
    filters: SearchResumeDto,
  ): number {
    let score = 0;
    let total = 0;

    const data = resume.dataJson || {};

    if (filters.query) {
      const tokens = this.tokenize(filters.query);

      const searchableText = `
      ${resume.fullName || ''}
      ${resume.email || ''}
      ${JSON.stringify(data)}
    `.toLowerCase();

      total += tokens.length;

      score += tokens.filter(token =>
        searchableText.includes(token),
      ).length;
    }

    if (filters.skills) {
      const searchedSkills =
        this.tokenize(filters.skills);

      const candidateSkills =
        (data.skills || []).map((s: string) =>
          s.toLowerCase(),
        );

      total += searchedSkills.length;

      score += searchedSkills.filter(skill =>
        candidateSkills.some(candidate =>
          candidate.includes(skill),
        ),
      ).length;
    }

    if (filters.title) {
      const title =
        (data.role || '').toLowerCase();

      total += 1;

      if (
        title.includes(
          filters.title.toLowerCase(),
        )
      ) {
        score += 1;
      }
    }

    if (filters.city) {
      const city =
        data.location?.city?.toLowerCase() || '';

      total += 1;

      if (
        city.includes(
          filters.city.toLowerCase(),
        )
      ) {
        score += 1;
      }
    }

    if (filters.degree) {
      const educationText = JSON.stringify(
        data.education || [],
      ).toLowerCase();

      total += 1;

      if (
        educationText.includes(
          filters.degree.toLowerCase(),
        )
      ) {
        score += 1;
      }
    }

    if (total === 0) {
      return 100;
    }

    return Math.round((score / total) * 100);
  }


  async findAllWithCompatibility(
    user: any,
    query: SearchResumeDto,
  ) {
    const isAdmin =
      user.role === 'admin' ||
      user.role?.name === 'admin';

    const { page, pageSize, skip } = parsePagination(query.page, query.pageSize);

    const where: any = {
      deletedAt: null,
    };

    if (!isAdmin) {
      where.companyId = user.companyId;
    }

    if (query.confidenceMin) {
      where.confidence = {
        gte: Number(query.confidenceMin),
      };
    }

    const resumes =
      await this.prisma.resume.findMany({
        where,
        include: {
          company: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    const rankedResumes = resumes.map(
      (resume) => {
        const compatibility =
          this.calculateMatchScore(
            resume,
            query,
          );

        return {
          ...resume,
          compatibility,
        };
      },
    );

    rankedResumes.sort(
      (a, b) =>
        b.compatibility -
        a.compatibility,
    );

    const paginatedData =
      rankedResumes.slice(
        skip,
        skip + pageSize,
      );

    return {
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        totalItems:
          rankedResumes.length,
        totalPages: Math.ceil(
          rankedResumes.length /
          pageSize,
        ),
      },
    };
  }
}