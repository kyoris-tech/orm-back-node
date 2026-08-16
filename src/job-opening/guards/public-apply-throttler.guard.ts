import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class PublicApplyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const code = typeof req.params?.code === 'string' ? req.params.code : '';
    return code ? `job-opening-apply:${code}` : `job-opening-apply-ip:${req.ip}`;
  }
}
