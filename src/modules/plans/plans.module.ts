import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { PlansController } from './presentation/plans.controller';
import { PlansService } from './application/plans.service';
import { PlanLimitsService } from './application/plan-limits.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PlansController],
  providers: [PlansService, PlanLimitsService],
  exports: [PlanLimitsService],
})
export class PlansModule {}
