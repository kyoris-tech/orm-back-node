import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { ResumesModule } from '../resumes/resumes.module';
import { PlansModule } from '../plans/plans.module';
import { SelectionProcessModule } from '../selection-processes/selection-process.module';
import { JobOpeningController } from './presentation/job-opening.controller';
import { PublicJobOpeningController } from './presentation/public-job-opening.controller';
import { JobOpeningService } from './application/job-opening.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    ResumesModule,
    PlansModule,
    SelectionProcessModule,
  ],
  controllers: [JobOpeningController, PublicJobOpeningController],
  providers: [JobOpeningService],
})
export class JobOpeningModule {}
