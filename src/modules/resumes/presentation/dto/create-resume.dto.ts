import type { Prisma } from '@prisma/client';

export class CreateResumeDto {
  fileName!: string;
  fullName?: string;
  email?: string;
  confidence?: number;
  processingMs?: number;
  costBrl?: number;
  dataJson?: Prisma.InputJsonValue;
}
