import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { randomBytes } from "crypto";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AuthUser } from "../auth/strategies/jwt.strategy";
import { Status } from "@prisma/client";


@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) { }

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email já registrado');
    }

    const apiKey = randomBytes(24).toString('hex');

    return this.prisma.company.create({
      data: {
        name: dto.name,
        email: dto.email,
        apiKey,
      }
    })
  }

  async listAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  async update(
    companyId: string,
    dto: UpdateCompanyDto,
    currentUser: AuthUser,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const oldName = company.name;

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: { name: dto.name },
    });

    await this.auditLogService.create({
      entityType: 'COMPANY',
      entityId: company.id,
      action: 'UPDATE_NAME',
      oldValue: oldName,
      newValue: dto.name,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return updatedCompany;
  }

  async regenerateToken(companyId: string, currentUser: AuthUser) {
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
    currentUser: AuthUser
  ) {
    const company = await this.prisma.company.findUnique({
      where: {
        id: companyId
      }
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada')
    }

    if (currentUser.companyId === company.id && newStatus === 'DELETED') {
      throw new ForbiddenException('Você não pode deletar a sua própria empresa')
    }

    const activeUsers = await this.prisma.user.count({
      where: {
        companyId: company.id,
        status: 'ACTIVE'
      }
    })

    if (newStatus === 'DELETED' && activeUsers > 0) {
      throw new ForbiddenException('Não é possível deletar empresa com usuários ativos')
    }

    const oldStatus = company.status;

    const updateCompany = await this.prisma.company.update({
      where: {
        id: companyId
      },
      data: {
        status: newStatus
      }
    })

    await this.auditLogService.create({
      entityType: 'COMPANY',
      entityId: company.id,
      action: 'UPDATE_STATUS',
      oldValue: oldStatus,
      newValue: newStatus,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    })

    return updateCompany;
  }
}