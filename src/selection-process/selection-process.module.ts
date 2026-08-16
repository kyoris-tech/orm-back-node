import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SelectionProcessController } from './selection-process.controller';
import { SelectionProcessService } from './selection-process.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [SelectionProcessController],
  providers: [SelectionProcessService],
})
export class SelectionProcessModule {}
