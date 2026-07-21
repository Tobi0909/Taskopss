import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { OnEvent } from '@nestjs/event-emitter';
import { WebhookEventType } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  TASK_EVENTS,
  TaskAssignedEvent,
  TaskChangedEvent,
  TaskCreatedEvent,
  TaskStatusChangedEvent,
} from '../tasks/tasks.events';
import { COMMENT_EVENTS, CommentCreatedEvent, CommentMentionedEvent } from '../comments/comments.events';

const RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 120_000, 600_000];
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  @OnEvent(TASK_EVENTS.CREATED)
  onTaskCreated(payload: TaskCreatedEvent) {
    return this.dispatch(WebhookEventType.TASK_CREATED, payload);
  }

  @OnEvent(TASK_EVENTS.ASSIGNED)
  onTaskAssigned(payload: TaskAssignedEvent) {
    return this.dispatch(WebhookEventType.TASK_ASSIGNED, payload);
  }

  @OnEvent(TASK_EVENTS.STATUS_CHANGED)
  onTaskStatusChanged(payload: TaskStatusChangedEvent) {
    return this.dispatch(WebhookEventType.TASK_STATUS_CHANGED, payload);
  }

  @OnEvent(TASK_EVENTS.CHANGED)
  onTaskChanged(payload: TaskChangedEvent) {
    return this.dispatch(WebhookEventType.TASK_CHANGED, payload);
  }

  @OnEvent(COMMENT_EVENTS.CREATED)
  onCommentCreated(payload: CommentCreatedEvent) {
    return this.dispatch(WebhookEventType.COMMENT_CREATED, payload);
  }

  @OnEvent(COMMENT_EVENTS.MENTIONED)
  onCommentMentioned(payload: CommentMentionedEvent) {
    return this.dispatch(WebhookEventType.COMMENT_MENTIONED, payload);
  }

  private async dispatch(eventType: WebhookEventType, payload: unknown) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { isActive: true, eventTypes: { has: eventType } },
    });
    await Promise.all(
      webhooks.map((webhook) => this.deliverWithRetry(webhook.id, webhook.url, webhook.secret, eventType, payload, 1)),
    );
  }

  private sign(secret: string, body: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }

  private async deliverWithRetry(
    webhookId: string,
    url: string,
    secret: string,
    eventType: WebhookEventType,
    payload: unknown,
    attempt: number,
  ): Promise<void> {
    if (attempt > 1) {
      const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
      if (!webhook || !webhook.isActive) {
        return; // deactivated or deleted mid-retry-cycle — stop here
      }
    }

    const body = JSON.stringify({ event: eventType, data: payload });
    let responseStatus: number | null = null;
    let success = false;

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Taskops-Signature': this.sign(secret, body),
          },
          timeout: REQUEST_TIMEOUT_MS,
        }),
      );
      responseStatus = response.status;
      success = response.status >= 200 && response.status < 300;
    } catch (error: any) {
      responseStatus = error?.response?.status ?? null;
      success = false;
    }

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload: payload as any,
        responseStatus,
        success,
        attempt,
      },
    });

    if (!success && attempt < RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      setTimeout(() => {
        this.deliverWithRetry(webhookId, url, secret, eventType, payload, attempt + 1).catch((err) =>
          this.logger.error(`Webhook retry failed for ${webhookId}`, err),
        );
      }, delay);
    }
  }
}
