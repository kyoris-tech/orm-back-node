import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SelectionProcessController } from './selection-process.controller';
import { SelectionProcessService } from './selection-process.service';

@Module({
  imports: [PrismaModule],
  controllers: [SelectionProcessController],
  providers: [SelectionProcessService],
})
export class SelectionProcessModule {}
