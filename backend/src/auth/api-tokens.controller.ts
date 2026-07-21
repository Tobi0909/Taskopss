import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiTokenService } from './api-token.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './types/auth.types';

@Controller('users/me/tokens')
export class ApiTokensController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Post()
  create(@Body() dto: CreateApiTokenDto, @CurrentUser() user: AuthenticatedUser) {
    return this.apiTokenService.create(
      user.id,
      dto.name,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiTokenService.list(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const revoked = await this.apiTokenService.revoke(user.id, id);
    if (!revoked) {
      throw new NotFoundException('Không tìm thấy API token');
    }
  }
}
