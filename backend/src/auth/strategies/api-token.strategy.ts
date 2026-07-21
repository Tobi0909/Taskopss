import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTokenService } from '../api-token.service';
import { AuthenticatedUser } from '../types/auth.types';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, 'api-token') {
  constructor(
    private readonly apiTokenService: ApiTokenService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async validate(req: Request): Promise<AuthenticatedUser> {
    const credential = extractBearerToken(req);
    if (!credential || !this.apiTokenService.isApiToken(credential)) {
      throw new UnauthorizedException();
    }
    const result = await this.apiTokenService.verify(credential);
    if (!result) {
      throw new UnauthorizedException('API token không hợp lệ hoặc đã bị thu hồi');
    }
    const user = await this.prisma.user.findUnique({ where: { id: result.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không còn hiệu lực');
    }
    return { id: user.id, role: user.role };
  }
}
