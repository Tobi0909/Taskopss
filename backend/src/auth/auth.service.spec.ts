import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: { user: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  const password = 'ChangeMe123!';
  let passwordHash: string;

  const baseUser = {
    id: 'user-1',
    email: 'an.nguyen@company.local',
    name: 'An Nguyễn',
    role: 'MEMBER' as const,
    avatarColor: '#4C8DFF',
    isActive: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return values[key];
            },
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('trả về user khi email và mật khẩu đúng', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      const result = await authService.validateCredentials(baseUser.email, password);

      expect(result.id).toBe(baseUser.id);
    });

    it('ném UnauthorizedException khi không tìm thấy user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.validateCredentials('unknown@company.local', password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('ném UnauthorizedException khi user bị deactivate', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash, isActive: false });

      await expect(authService.validateCredentials(baseUser.email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('ném UnauthorizedException khi sai mật khẩu', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(authService.validateCredentials(baseUser.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('issueTokens', () => {
    it('ký access token và refresh token với secret/expiry riêng biệt', () => {
      const tokens = authService.issueTokens({ ...baseUser, passwordHash });

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: baseUser.id, role: baseUser.role },
        { secret: 'access-secret', expiresIn: '15m' },
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: baseUser.id, tokenVersion: baseUser.tokenVersion },
        { secret: 'refresh-secret', expiresIn: '7d' },
      );
      expect(tokens.accessToken).toBe('signed.jwt.token');
      expect(tokens.refreshToken).toBe('signed.jwt.token');
    });
  });

  describe('logout', () => {
    it('tăng tokenVersion để vô hiệu hoá mọi refresh token đang có', async () => {
      prisma.user.update.mockResolvedValue({ ...baseUser, tokenVersion: 1 });

      await authService.logout(baseUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });

  describe('changePassword', () => {
    it('ném UnauthorizedException nếu mật khẩu hiện tại không đúng', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(authService.changePassword(baseUser.id, 'wrong', 'new-password-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('cập nhật passwordHash và tăng tokenVersion khi mật khẩu hiện tại đúng', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.user.update.mockResolvedValue({ ...baseUser });

      await authService.changePassword(baseUser.id, password, 'new-password-123');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseUser.id },
          data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
        }),
      );
    });
  });
});
