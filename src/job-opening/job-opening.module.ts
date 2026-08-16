import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { JobOpeningController } from './job-opening.controller';
import { JobOpeningService } from './job-opening.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [JobOpeningController],
  providers: [JobOpeningService],
})
export class JobOpeningModule {}
