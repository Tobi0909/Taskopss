import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

const DEFAULT_TAG_COLOR = '#6B7280';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Nhãn này đã tồn tại');
    }
    return this.prisma.tag.create({
      data: { name: dto.name, color: dto.color ?? DEFAULT_TAG_COLOR },
    });
  }

  async remove(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Không tìm thấy nhãn');
    }
    await this.prisma.tag.delete({ where: { id } });
  }
}
