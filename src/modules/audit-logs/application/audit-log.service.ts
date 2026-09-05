import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  buildPaginatedResult,
  parsePagination,
} from '../../../common/pagination/pagination';
import type {
  CreateAuditLogInput,
  ListAuditLogsFilters,
} from '../domain/audit-log.types';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue,
        newValue: input.newValue,
        performedByUserId: input.performedByUserId,
        performedByName: input.performedByName,
      },
    });
  }

  async listAll(filters: ListAuditLogsFilters) {
    const { page, pageSize, skip, take } = parsePagination(
      filters.page,
      filters.pageSize,
    );

    const where: Prisma.AuditLogWhereInput | undefined = filters.entityType
      ? { entityType: filters.entityType }
      : undefined;

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }
}
