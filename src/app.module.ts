import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/companies/company.module';
import { UserModule } from './modules/users/user.module';
import { AuditLogModule } from './modules/audit-logs/audit-log.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { SelectionProcessModule } from './modules/selection-processes/selection-process.module';
import { JobOpeningModule } from './modules/job-openings/job-opening.module';
import { HealthModule } from './modules/health/health.module';

const THROTTLER_TTL_MS = 60_000;
const THROTTLER_LIMIT = 5;

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: THROTTLER_TTL_MS,
        limit: THROTTLER_LIMIT,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    CompanyModule,
    UserModule,
    AuditLogModule,
    ResumesModule,
    SelectionProcessModule,
    JobOpeningModule,
  ],
})
export class AppModule {}
