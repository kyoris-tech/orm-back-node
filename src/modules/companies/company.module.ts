import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyController } from './presentation/company.controller';
import { CompanyService } from './application/company.service';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogModule, PlansModule],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
