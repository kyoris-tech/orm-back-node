import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobOpeningController } from './job-opening.controller';
import { JobOpeningService } from './job-opening.service';

@Module({
  imports: [PrismaModule],
  controllers: [JobOpeningController],
  providers: [JobOpeningService],
})
export class JobOpeningModule {}
