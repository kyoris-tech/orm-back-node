import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthUser } from '../auth/strategies/jwt.strategy';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listAll() {
    const plans = await this.prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { companies: true } } },
    });

    return plans.map(({ _count, ...plan }) => ({ ...plan, companyCount: _count.companies }));
  }

  async create(dto: CreatePlanDto, currentUser: AuthUser) {
    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        maxUsers: dto.maxUsers ?? null,
        maxResumesPerMonth: dto.maxResumesPerMonth ?? null,
        features: dto.features ?? [],
      },
    });

    await this.auditLogService.create({
      entityType: 'PLAN',
      entityId: plan.id,
      action: 'CREATE',
      newValue: plan.name,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto, currentUser: AuthUser) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.maxUsers !== undefined) data.maxUsers = dto.maxUsers;
    if (dto.maxResumesPerMonth !== undefined) data.maxResumesPerMonth = dto.maxResumesPerMonth;
    if (dto.features !== undefined) data.features = dto.features;

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data,
    });

    await this.auditLogService.create({
      entityType: 'PLAN',
      entityId: plan.id,
      action: 'UPDATE',
      oldValue: plan.name,
      newValue: updatedPlan.name,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return updatedPlan;
  }

  async delete(id: string, currentUser: AuthUser) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { companies: true } } },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    if (plan._count.companies > 0) {
      throw new ConflictException(
        `Não é possível excluir o plano "${plan.name}": ${plan._count.companies} empresa(s) ainda estão vinculadas a ele.`,
      );
    }

    await this.prisma.plan.delete({ where: { id } });

    await this.auditLogService.create({
      entityType: 'PLAN',
      entityId: plan.id,
      action: 'DELETE',
      oldValue: plan.name,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return { id };
  }
}
