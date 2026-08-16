import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface ListAuditLogsFilters {
  entityType?: string;
  page?: string;
  pageSize?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  async create(dto: CreateAuditLogDto) {
    return this.prismaService.auditLog.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        oldValue: dto.oldValue,
        newValue: dto.newValue,
        performedByUserId: dto.performedByUserId,
        performedByName: dto.performedByName,
      },
    });
  }

  async listAll(filters: ListAuditLogsFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(filters.pageSize) || DEFAULT_PAGE_SIZE));

    const where = filters.entityType ? { entityType: filters.entityType } : undefined;

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}