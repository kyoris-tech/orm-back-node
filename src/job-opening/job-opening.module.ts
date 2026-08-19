import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ResumesModule } from '../resumes/resumes.module';
import { PlanLimitsModule } from '../plans/plan-limits.module';
import { SelectionProcessModule } from '../selection-process/selection-process.module';
import { JobOpeningController } from './job-opening.controller';
import { PublicJobOpeningController } from './public-job-opening.controller';
import { JobOpeningService } from './job-opening.service';

@Module({
  imports: [PrismaModule, AuditLogModule, ResumesModule, PlanLimitsModule, SelectionProcessModule],
  controllers: [JobOpeningController, PublicJobOpeningController],
  providers: [JobOpeningService],
})
export class JobOpeningModule {}
