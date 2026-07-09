import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import ms from 'ms';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './types/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const maxAge = ms(this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as ms.StringValue);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateCredentials(dto.email, dto.password);
    const tokens = this.authService.issueTokens(user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: this.authService.toSafeUser(user) };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const tokens = this.authService.issueTokens(user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: this.authService.toSafeUser(user) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return this.authService.toSafeUser(fullUser);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
