import { Injectable, Logger } from '@nestjs/common';

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
const FETCH_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FALLBACK_USD_BRL = 5.12;

const MIN_PLAUSIBLE_RATE = 1;
const MAX_PLAUSIBLE_RATE = 20;

function parseRate(value: unknown): number | null {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < MIN_PLAUSIBLE_RATE ||
    parsed > MAX_PLAUSIBLE_RATE
  ) {
    return null;
  }

  return parsed;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  private cachedRate: number | null = null;
  private cachedAt = 0;

  async getUsdToBrl(): Promise<number> {
    const pinnedRate = parseRate(process.env.USD_BRL);

    if (pinnedRate !== null) {
      return pinnedRate;
    }

    if (this.cachedRate !== null && Date.now() - this.cachedAt < CACHE_TTL_MS) {
      return this.cachedRate;
    }

    const fetchedRate = await this.fetchRate();

    if (fetchedRate !== null) {
      this.cachedRate = fetchedRate;
      this.cachedAt = Date.now();

      this.logger.log(
        `Cotação do dólar atualizada: R$${fetchedRate.toFixed(4)}`,
      );

      return fetchedRate;
    }

    if (this.cachedRate !== null) {
      this.logger.warn(
        `Não foi possível atualizar a cotação do dólar; mantendo o último valor conhecido (R$${this.cachedRate.toFixed(4)})`,
      );

      return this.cachedRate;
    }

    this.logger.warn(
      `Não foi possível obter a cotação do dólar; usando o valor padrão (R$${FALLBACK_USD_BRL.toFixed(4)})`,
    );

    return FALLBACK_USD_BRL;
  }

  private async fetchRate(): Promise<number | null> {
    try {
      const response = await fetch(AWESOME_API_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { USDBRL?: { bid?: string } };

      return parseRate(payload?.USDBRL?.bid);
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar a cotação do dólar: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
