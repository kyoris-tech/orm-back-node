import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PlanLimitsService } from './plan-limits.service';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PlansController],
  providers: [PlanLimitsService, PlansService],
  exports: [PlanLimitsService],
})
export class PlanLimitsModule {}
