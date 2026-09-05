import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateCompanyDto } from '../presentation/dto/create-company.dto';
import { UpdateCompanyDto } from '../presentation/dto/update-company.dto';
import { randomBytes } from 'crypto';
import { AuditLogService } from '../../audit-logs/application/audit-log.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { Status, Prisma } from '@prisma/client';
import { PlanLimitsService } from '../../plans/application/plan-limits.service';
import {
  buildPaginatedResult,
  parsePagination,
} from '../../../common/pagination/pagination';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email já registrado');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    const apiKey = randomBytes(24).toString('hex');

    try {
      return await this.prisma.company.create({
        data: {
          name: dto.name,
          email: dto.email,
          apiKey,
          cnpj: dto.cnpj,
          planId: dto.planId,
          phone: dto.phone,
          address: dto.address,
          website: dto.website,
          segment: dto.segment,
          contactName: dto.contactName,
          billingDay: dto.billingDay,
        },
        include: { plan: true },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new BadRequestException('CNPJ já cadastrado');
      }

      throw error;
    }
  }

  async listAll(query: PaginationQueryDto = {}) {
    const { page, pageSize, skip, take } = parsePagination(
      query.page,
      query.pageSize,
    );

    const [companies, totalItems] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
        skip,
        take,
      }),
      this.prisma.company.count(),
    ]);

    return buildPaginatedResult(companies, totalItems, page, pageSize);
  }

  async update(
    companyId: string,
    dto: UpdateCompanyDto,
    currentUser: AuthenticatedUser,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    let newPlan = company.plan;

    if (dto.planId && dto.planId !== company.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plano não encontrado');
      }

      newPlan = plan;
    }

    const data: Prisma.CompanyUncheckedUpdateInput = { name: dto.name };
    if (dto.planId !== undefined) data.planId = dto.planId;
    if (dto.cnpj !== undefined) data.cnpj = dto.cnpj;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.segment !== undefined) data.segment = dto.segment;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.billingDay !== undefined) data.billingDay = dto.billingDay;

    const updatedCompany = await this.updateCompanyRecord(companyId, data);

    if (dto.name !== company.name) {
      await this.auditLogService.create({
        entityType: 'COMPANY',
        entityId: company.id,
        action: 'UPDATE_NAME',
        oldValue: company.name,
        newValue: dto.name,
        performedByUserId: currentUser.userId,
        performedByName: currentUser.email,
      });
    }

    if (newPlan.id !== company.plan.id) {
      await this.auditLogService.create({
        entityType: 'COMPANY',
        entityId: company.id,
        action: 'UPDATE_PLAN',
        oldValue: company.plan.name,
        newValue: newPlan.name,
        performedByUserId: currentUser.userId,
        performedByName: currentUser.email,
      });
    }

    const detailFields: Array<[keyof UpdateCompanyDto, string]> = [
      ['cnpj', company.cnpj ?? ''],
      ['phone', company.phone ?? ''],
      ['address', company.address ?? ''],
      ['website', company.website ?? ''],
      ['segment', company.segment ?? ''],
      ['contactName', company.contactName ?? ''],
      ['billingDay', company.billingDay?.toString() ?? ''],
    ];

    const changedDetails = detailFields.filter(
      ([field, oldValue]) =>
        dto[field] !== undefined && String(dto[field]) !== oldValue,
    );

    if (changedDetails.length > 0) {
      await this.auditLogService.create({
        entityType: 'COMPANY',
        entityId: company.id,
        action: 'UPDATE_DETAILS',
        oldValue: JSON.stringify(
          Object.fromEntries(
            changedDetails.map(([field, oldValue]) => [field, oldValue]),
          ),
        ),
        newValue: JSON.stringify(
          Object.fromEntries(
            changedDetails.map(([field]) => [field, dto[field]]),
          ),
        ),
        performedByUserId: currentUser.userId,
        performedByName: currentUser.email,
      });
    }

    return updatedCompany;
  }

  private async updateCompanyRecord(
    companyId: string,
    data: Prisma.CompanyUncheckedUpdateInput,
  ) {
    try {
      return await this.prisma.company.update({
        where: { id: companyId },
        data,
        include: { plan: true },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new BadRequestException('CNPJ já cadastrado');
      }

      throw error;
    }
  }

  async regenerateToken(companyId: string, currentUser: AuthenticatedUser) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const apiKey = randomBytes(24).toString('hex');

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: { apiKey },
    });

    await this.auditLogService.create({
      entityType: 'COMPANY',
      entityId: company.id,
      action: 'REGENERATE_TOKEN',
      oldValue: undefined,
      newValue: undefined,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return updatedCompany;
  }

  async updateStatus(
    companyId: string,
    newStatus: Status,
    currentUser: AuthenticatedUser,
  ) {
    const company = await this.prisma.company.findUnique({
      where: {
        id: companyId,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (currentUser.companyId === company.id && newStatus === 'DELETED') {
      throw new ForbiddenException(
        'Você não pode deletar a sua própria empresa',
      );
    }

    const activeUsers = await this.prisma.user.count({
      where: {
        companyId: company.id,
        status: 'ACTIVE',
      },
    });

    if (newStatus === 'DELETED' && activeUsers > 0) {
      throw new ForbiddenException(
        'Não é possível deletar empresa com usuários ativos',
      );
    }

    const oldStatus = company.status;

    const updateCompany = await this.prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        status: newStatus,
      },
    });

    await this.auditLogService.create({
      entityType: 'COMPANY',
      entityId: company.id,
      action: 'UPDATE_STATUS',
      oldValue: oldStatus,
      newValue: newStatus,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return updateCompany;
  }

  async getPlanUsage(companyId: string) {
    return this.planLimitsService.getUsage(companyId);
  }

  async updatePlan(
    companyId: string,
    newPlanId: string,
    currentUser: AuthenticatedUser,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('Plano não encontrado');
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: { planId: newPlanId },
      include: { plan: true },
    });

    await this.auditLogService.create({
      entityType: 'COMPANY',
      entityId: company.id,
      action: 'UPDATE_PLAN',
      oldValue: company.plan.name,
      newValue: newPlan.name,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return updatedCompany;
  }
}
