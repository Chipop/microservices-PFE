import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

export interface AuthUser {
  userId: number;
  token: string;
}

interface AccessTokenPayload {
  user_id?: number | string;
  token_type?: string;
}

/**
 * Stateless JWT guard — the equivalent of the legacy Django task/todo service's
 * StatelessJWTAuthentication: verify the HS256 token signed with the shared
 * JWT_SIGNING_KEY (issued by auth-service), trust the `user_id` claim, and do
 * NOT look up a user (this service has no users table). Attaches { userId } to
 * the request for the @CurrentUser decorator.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SIGNING_KEY'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = Number(payload.user_id);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Token has no user_id claim');
    }

    (request as Request & { user: AuthUser }).user = { userId, token };
    return true;
  }
}
