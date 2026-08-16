import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CompanyController } from "./company.controller";
import { CompanyService } from "./company.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PlanLimitsModule } from "../plans/plan-limits.module";


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogModule,
    PlanLimitsModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
})

export class CompanyModule {}