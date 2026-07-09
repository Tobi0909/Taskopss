import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarColor: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: SAFE_USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email này đã có tài khoản');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role ?? Role.MEMBER,
        avatarColor: dto.avatarColor ?? '#22B8B0',
      },
      select: SAFE_USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }

    const losingAdminStatus =
      existing.role === Role.ADMIN &&
      existing.isActive &&
      ((dto.role !== undefined && dto.role !== Role.ADMIN) || dto.isActive === false);
    if (losingAdminStatus) {
      await this.assertOtherActiveAdminExists(id);
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        avatarColor: dto.avatarColor,
        isActive: dto.isActive,
        ...(passwordHash ? { passwordHash, tokenVersion: { increment: 1 } } : {}),
      },
      select: SAFE_USER_SELECT,
    });
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Không thể tự xoá tài khoản đang đăng nhập của chính bạn');
    }
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }
    if (existing.role === Role.ADMIN && existing.isActive) {
      await this.assertOtherActiveAdminExists(id);
    }
    await this.prisma.user.delete({ where: { id } });
  }

  private async assertOtherActiveAdminExists(excludeUserId: string) {
    const otherActiveAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: excludeUserId } },
    });
    if (otherActiveAdmins === 0) {
      throw new BadRequestException(
        'Đây là admin đang hoạt động cuối cùng — không thể xoá, khoá, hoặc hạ quyền. Hãy tạo admin khác trước.',
      );
    }
  }
}
