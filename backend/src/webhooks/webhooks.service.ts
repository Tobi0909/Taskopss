import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { isBlockedWebhookHost } from './webhook-url-guard';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  private assertUrlAllowed(url: string) {
    if (isBlockedWebhookHost(url)) {
      throw new BadRequestException('URL webhook không hợp lệ (không được trỏ vào địa chỉ nội bộ/loopback)');
    }
  }

  async findAll() {
    return this.prisma.webhook.findMany({
      select: { id: true, url: true, eventTypes: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateWebhookDto, actorId: string) {
    this.assertUrlAllowed(dto.url);
    const secret = randomBytes(32).toString('hex');
    const webhook = await this.prisma.webhook.create({
      data: { url: dto.url, eventTypes: dto.eventTypes, secret, createdById: actorId },
    });
    return { id: webhook.id, url: webhook.url, eventTypes: webhook.eventTypes, secret, isActive: webhook.isActive };
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException('Không tìm thấy webhook');
    }
    if (dto.url) {
      this.assertUrlAllowed(dto.url);
    }
    return this.prisma.webhook.update({
      where: { id },
      data: { url: dto.url, eventTypes: dto.eventTypes, isActive: dto.isActive },
      select: { id: true, url: true, eventTypes: true, isActive: true, createdAt: true },
    });
  }

  async remove(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException('Không tìm thấy webhook');
    }
    await this.prisma.webhook.delete({ where: { id } });
  }

  async listDeliveries(webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      throw new NotFoundException('Không tìm thấy webhook');
    }
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
