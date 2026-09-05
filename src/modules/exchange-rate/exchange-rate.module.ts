import { Module } from '@nestjs/common';
import { ExchangeRateService } from './application/exchange-rate.service';

@Module({
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
