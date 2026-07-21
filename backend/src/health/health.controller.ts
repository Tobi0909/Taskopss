import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.healthCheck.check([() => this.prismaIndicator.isHealthy('database')]);
  }

  @Public()
  @Get('health')
  @HealthCheck()
  health() {
    return this.healthCheck.check([() => this.prismaIndicator.isHealthy('database')]);
  }
}
