import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TASK_EVENTS, TaskChangedEvent } from '../tasks/tasks.events';
import { JwtAccessPayload } from '../auth/types/auth.types';

interface NotificationCreatedEvent {
  id: string;
  recipientId: string;
  type: string;
  taskId: string | null;
  commentId: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        throw new Error('Thiếu access token');
      }
      const payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch (err) {
      this.logger.warn(`Từ chối kết nối socket: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('board:join')
  handleJoinBoard(@ConnectedSocket() client: Socket, @MessageBody() boardId: string) {
    client.join(`board:${boardId}`);
  }

  @SubscribeMessage('board:leave')
  handleLeaveBoard(@ConnectedSocket() client: Socket, @MessageBody() boardId: string) {
    client.leave(`board:${boardId}`);
  }

  @OnEvent(TASK_EVENTS.CHANGED)
  handleTaskChanged(payload: TaskChangedEvent) {
    this.server.to(`board:${payload.boardId}`).emit('task:changed', { taskId: payload.taskId });
  }

  @OnEvent('notification.created')
  handleNotificationCreated(notification: NotificationCreatedEvent) {
    this.server.to(`user:${notification.recipientId}`).emit('notification:new', notification);
  }
}
