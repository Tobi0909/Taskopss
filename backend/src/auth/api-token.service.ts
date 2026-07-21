import { randomBytes, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

const TOKEN_PREFIX = 'tok_';

@Injectable()
export class ApiTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  generatePlaintext(): string {
    return TOKEN_PREFIX + randomBytes(32).toString('base64url');
  }

  hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  isApiToken(credential: string): boolean {
    return credential.startsWith(TOKEN_PREFIX);
  }

  async create(userId: string, name: string, expiresAt?: Date) {
    const plaintext = this.generatePlaintext();
    const token = await this.prisma.apiToken.create({
      data: { userId, name, tokenHash: this.hash(plaintext), expiresAt },
    });
    await this.auditLog.record(userId, AuditAction.API_TOKEN_CREATED, 'ApiToken', token.id, { name });
    return { id: token.id, name: token.name, token: plaintext, expiresAt: token.expiresAt };
  }

  async list(userId: string) {
    return this.prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, tokenId: string): Promise<boolean> {
    const result = await this.prisma.apiToken.updateMany({
      where: { id: tokenId, userId },
      data: { revokedAt: new Date() },
    });
    const revoked = result.count > 0;
    if (revoked) {
      await this.auditLog.record(userId, AuditAction.API_TOKEN_REVOKED, 'ApiToken', tokenId, {});
    }
    return revoked;
  }

  /** Resolves a plaintext bearer credential to its owning user id, or null if invalid. */
  async verify(plaintext: string): Promise<{ userId: string } | null> {
    const token = await this.prisma.apiToken.findUnique({
      where: { tokenHash: this.hash(plaintext) },
    });
    if (!token || token.revokedAt || (token.expiresAt && token.expiresAt < new Date())) {
      return null;
    }
    // Fire-and-forget: don't hold up the request on this write.
    void this.prisma.apiToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return { userId: token.userId };
  }
}
