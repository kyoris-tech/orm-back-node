import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { PlansModule } from '../plans/plans.module';
import { UserController } from './presentation/user.controller';
import { UserService } from './application/user.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogModule, PlansModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
