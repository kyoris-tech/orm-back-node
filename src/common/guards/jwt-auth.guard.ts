import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../types/authenticated-user';

interface JwtVerificationInfo {
  name?: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: JwtVerificationInfo | undefined,
  ): TUser {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token expirado. Faça login novamente.');
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('Token inválido.');
    }

    if (err || !user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return user;
  }
}
