import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PlanLimitsModule } from '../plans/plan-limits.module';
import { SelectionProcessController } from './selection-process.controller';
import { SelectionProcessService } from './selection-process.service';

@Module({
  imports: [PrismaModule, AuditLogModule, PlanLimitsModule],
  controllers: [SelectionProcessController],
  providers: [SelectionProcessService],
  exports: [SelectionProcessService],
})
export class SelectionProcessModule {}
