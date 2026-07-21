import { ArrayMinSize, IsArray, IsEnum, IsUrl } from 'class-validator';
import { WebhookEventType } from '@prisma/client';

export class CreateWebhookDto {
  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  eventTypes!: WebhookEventType[];
}
