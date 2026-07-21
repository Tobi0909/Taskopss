import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { WebhookEventType } from '@prisma/client';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  url?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  eventTypes?: WebhookEventType[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
