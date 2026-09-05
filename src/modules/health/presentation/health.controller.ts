import { Controller, Get } from '@nestjs/common';

interface HealthStatus {
  status: 'ok';
  uptime: number;
}

@Controller()
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
    };
  }
}
