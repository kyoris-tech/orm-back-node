import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface LoginRequest {
  body?: { email?: unknown };
  ip?: string;
}

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: LoginRequest): Promise<string> {
    const rawEmail = req.body?.email;
    const email =
      typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    return Promise.resolve(email ? `login:${email}` : `login-ip:${req.ip}`);
  }
}
