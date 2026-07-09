import { Role } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  role: Role;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenVersion: number;
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
}
