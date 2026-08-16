import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { userController } from "./user.controller";
import { UserService } from "./user.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PlanLimitsModule } from "../plans/plan-limits.module";


@Module({
  imports: [PrismaModule, AuthModule, AuditLogModule, PlanLimitsModule],
  controllers: [userController],
  providers: [UserService]
})

export class UserModule {}