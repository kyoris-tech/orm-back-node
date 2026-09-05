import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface PublicApplyRequest {
  params?: { code?: unknown };
  ip?: string;
}

@Injectable()
export class PublicApplyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: PublicApplyRequest): Promise<string> {
    const rawCode = req.params?.code;
    const code = typeof rawCode === 'string' ? rawCode : '';

    return Promise.resolve(
      code ? `job-opening-apply:${code}` : `job-opening-apply-ip:${req.ip}`,
    );
  }
}
