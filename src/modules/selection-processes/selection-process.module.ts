import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { PlansModule } from '../plans/plans.module';
import { SelectionProcessController } from './presentation/selection-process.controller';
import { SelectionProcessService } from './application/selection-process.service';

@Module({
  imports: [PrismaModule, AuditLogModule, PlansModule],
  controllers: [SelectionProcessController],
  providers: [SelectionProcessService],
  exports: [SelectionProcessService],
})
export class SelectionProcessModule {}
