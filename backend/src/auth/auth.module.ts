import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiTokenService } from './api-token.service';
import { ApiTokensController } from './api-tokens.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { ApiTokenStrategy } from './strategies/api-token.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, ApiTokensController],
  providers: [AuthService, ApiTokenService, JwtAccessStrategy, JwtRefreshStrategy, ApiTokenStrategy],
  exports: [AuthService, ApiTokenService],
})
export class AuthModule {}
