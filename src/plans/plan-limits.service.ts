import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURE_LABELS, startOfCurrentMonth, type PlanFeature } from './plan-limits';

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCompanyPlan(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company.plan;
  }

  async getUsage(companyId: string) {
    const plan = await this.getCompanyPlan(companyId);
    const periodStart = startOfCurrentMonth();

    const [activeUsers, resumesThisMonth] = await Promise.all([
      this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.resume.count({ where: { companyId, createdAt: { gte: periodStart } } }),
    ]);

    return {
      plan: plan.id,
      label: plan.name,
      features: plan.features as PlanFeature[],
      users: { used: activeUsers, limit: plan.maxUsers },
      resumes: { used: resumesThisMonth, limit: plan.maxResumesPerMonth, periodStart },
    };
  }

  async assertCanCreateUser(companyId: string) {
    const plan = await this.getCompanyPlan(companyId);

    if (plan.maxUsers === null) {
      return;
    }

    const activeUsers = await this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } });

    if (activeUsers >= plan.maxUsers) {
      throw new ForbiddenException(
        `O plano ${plan.name} permite até ${plan.maxUsers} usuário(s) ativo(s). Bloqueie um usuário ou faça upgrade de plano para adicionar mais.`,
      );
    }
  }

  async assertCanProcessResume(companyId: string) {
    const plan = await this.getCompanyPlan(companyId);

    if (plan.maxResumesPerMonth === null) {
      return;
    }

    const resumesThisMonth = await this.prisma.resume.count({
      where: { companyId, createdAt: { gte: startOfCurrentMonth() } },
    });

    if (resumesThisMonth >= plan.maxResumesPerMonth) {
      throw new ForbiddenException(
        `O plano ${plan.name} permite até ${plan.maxResumesPerMonth} currículo(s) processado(s) por mês. Faça upgrade de plano para continuar importando.`,
      );
    }
  }

  async assertFeatureEnabled(companyId: string, feature: PlanFeature) {
    const plan = await this.getCompanyPlan(companyId);

    if (!plan.features.includes(feature)) {
      throw new ForbiddenException(
        `"${FEATURE_LABELS[feature]}" não está disponível no plano ${plan.name}. Faça upgrade de plano para liberar este recurso.`,
      );
    }
  }
}
