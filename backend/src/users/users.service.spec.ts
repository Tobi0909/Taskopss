import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    usersService = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('ném ConflictException nếu email đã tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        usersService.create({ email: 'a@company.local', name: 'A', password: 'password123' }, 'actor-1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('tạo user mới với role mặc định MEMBER khi email chưa tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'new-user' });

      await usersService.create({ email: 'a@company.local', name: 'A', password: 'password123' }, 'actor-1');

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'a@company.local', role: 'MEMBER' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('ném NotFoundException nếu không tìm thấy user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.update('missing-id', { name: 'B' }, 'actor-1')).rejects.toThrow(NotFoundException);
    });

    it('cập nhật user khi tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: Role.MEMBER, isActive: true });
      prisma.user.update.mockResolvedValue({ id: 'user-1', name: 'B' });

      const result = await usersService.update('user-1', { name: 'B' }, 'actor-1');

      expect(result).toEqual({ id: 'user-1', name: 'B' });
    });

    it('chặn hạ quyền admin đang hoạt động cuối cùng xuống MEMBER', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN, isActive: true });
      prisma.user.count.mockResolvedValue(0);

      await expect(usersService.update('admin-1', { role: Role.MEMBER }, 'actor-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('cho phép hạ quyền admin nếu còn admin khác đang hoạt động', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN, isActive: true });
      prisma.user.count.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue({ id: 'admin-1', role: Role.MEMBER });

      await usersService.update('admin-1', { role: Role.MEMBER }, 'actor-1');

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('chặn khoá tài khoản admin đang hoạt động cuối cùng', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN, isActive: true });
      prisma.user.count.mockResolvedValue(0);

      await expect(usersService.update('admin-1', { isActive: false }, 'actor-1')).rejects.toThrow(BadRequestException);
    });

    it('băm mật khẩu mới và tăng tokenVersion khi đổi mật khẩu', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: Role.MEMBER, isActive: true });
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await usersService.update('user-1', { password: 'new-password-123' }, 'actor-1');

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).toBeDefined();
      expect(updateCall.data.passwordHash).not.toBe('new-password-123');
      expect(updateCall.data.tokenVersion).toEqual({ increment: 1 });
    });
  });

  describe('remove', () => {
    it('ném BadRequestException nếu tự xoá chính mình', async () => {
      await expect(usersService.remove('user-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('ném NotFoundException nếu không tìm thấy user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.remove('missing-id', 'actor-1')).rejects.toThrow(NotFoundException);
    });

    it('chặn xoá admin đang hoạt động cuối cùng', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: Role.ADMIN, isActive: true });
      prisma.user.count.mockResolvedValue(0);

      await expect(usersService.remove('admin-1', 'actor-1')).rejects.toThrow(BadRequestException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('xoá thành công thành viên thường', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'member-1', role: Role.MEMBER, isActive: true });
      prisma.user.delete.mockResolvedValue({});

      await usersService.remove('member-1', 'actor-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'member-1' } });
    });
  });
});
