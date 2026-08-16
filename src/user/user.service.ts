import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import * as bcrypt from 'bcrypt'
import { AuthUser } from "../auth/strategies/jwt.strategy";
import { Status } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) { }

  async create(dto: CreateUserDto, currentUser: AuthUser) {
    if (dto.role === 'admin' && dto.companyId !== currentUser.companyId) {
      throw new ForbiddenException(
        'Só é possível criar administradores dentro da própria empresa administradora',
      );
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email }
    })

    if (existingUser) {
      throw new BadRequestException('Email já cadastrado');
    }

    const company = await this.prismaService.company.findUnique({
      where: { id: dto.companyId },
    })

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const role = await this.prismaService.role.findUnique({
      where: { name: dto.role },
    })

    if (!role) {
      throw new NotFoundException('Permissão não encontrada');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prismaService.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        companyId: dto.companyId,
        roleId: role.id,
      },
      include: {
        company: true,
        role: true
      }
    })
  }

  async listAll() {
    return this.prismaService.user.findMany({
      include: {
        company: true,
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async exportAll() {
    const users = await this.prismaService.user.findMany({
      include: {
        company: true,
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusLogs = await this.prismaService.auditLog.findMany({
      where: { entityType: 'USER', action: 'UPDATE_STATUS' },
      orderBy: { createdAt: 'asc' },
    });

    const logsByUser = new Map<string, typeof statusLogs>();

    for (const log of statusLogs) {
      const existing = logsByUser.get(log.entityId) ?? [];
      existing.push(log);
      logsByUser.set(log.entityId, existing);
    }

    return users.map((user) => {
      const logs = logsByUser.get(user.id) ?? [];
      const blockedLog = [...logs].reverse().find((log) => log.newValue === 'BLOCKED');
      const deletedLog = [...logs].reverse().find((log) => log.newValue === 'DELETED');

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        companyId: user.companyId,
        companyName: user.company?.name ?? null,
        role: user.role?.name ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        blockedAt: blockedLog?.createdAt ?? null,
        blockedBy: blockedLog?.performedByName ?? null,
        deletedAt: deletedLog?.createdAt ?? null,
        deletedBy: deletedLog?.performedByName ?? null,
      };
    });
  }

  async updateStatus(
    targetUserId: string,
    newStatus: Status,
    currentUser: AuthUser,
  ) {
    const targetUser = await this.prismaService.user.findUnique({
      where: {
        id: targetUserId,
      },
      include: {
        role: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'Usuário não encontrado',
      );
    }

    if (currentUser.userId === targetUser.id && newStatus === 'DELETED') {
      throw new ForbiddenException(
        'Você não pode deletar seu próprio usuário',
      )
    }

    if (
      currentUser.role === 'mod' &&
      targetUser.companyId !== currentUser.companyId
    ) {
      throw new ForbiddenException(
        'Sem permissão para alterar este usuário',
      );
    }

    if (
      currentUser.role === 'mod' &&
      targetUser.role.name === 'admin'
    ) {
      throw new ForbiddenException(
        'Sem permissão para alterar este usuário',
      );
    }

    const oldStatus = targetUser.status;

    const updatedUser = await this.prismaService.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        status: newStatus,
      },
    });

    await this.auditLogService.create({
      entityType: 'USER',
      entityId: targetUser.id,
      action: 'UPDATE_STATUS',
      oldValue: oldStatus,
      newValue: newStatus,
      performedByUserId: currentUser.userId,
      performedByName: currentUser.email,
    });

    return updatedUser;
  }

  async getProfile(userId: string) {
    const user =
      await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          company: true,
          role: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado',
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName:
        user.company?.name || null,
      role:
        user.role?.name || null,
      status: user.status,
    };
  }
}