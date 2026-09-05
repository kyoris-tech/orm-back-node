import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ExchangeRateService } from '../../../exchange-rate/application/exchange-rate.service';
import type { ResumeData } from '../../domain/resume-data';
import type { ResumeAnalysis } from '../../domain/resume-analysis';

const RESUME_MODEL = process.env.OPENAI_RESUME_MODEL ?? 'gpt-4.1-mini';

const DEFAULT_COST_INPUT_PER_MILLION = 0.4;
const DEFAULT_COST_OUTPUT_PER_MILLION = 1.6;

const MAX_COMPLETION_TOKENS = 3000;

const EXTRACTION_CONTRACT = `Você extrai dados de currículos e responde APENAS com JSON válido, sem texto fora dele.

REGRAS
- Extraia somente o que está escrito. Nunca invente, deduza ou complete dados.
- Não corrija nem reformate e-mails, telefones, datas ou nomes próprios.
- Campo ausente no currículo: string vazia "" ou array vazio [].
- Ignore cabeçalhos, rodapés e marcas d'água do arquivo.

CAMPOS
- fullName: nome da pessoa candidata, como escrito.
- email / phones: contatos. phones é array, um por item, com o formato original.
- location: cidade, estado (sigla quando houver) e CEP.
- role: cargo ATUAL ou o mais recente. Se não houver experiência, use o objetivo profissional declarado.
- summary: resumo/objetivo em texto corrido, se existir.
- qualifications: qualificações em texto corrido quando não houver divisão clara em tópicos.
- skills: array de competências individuais ("React", "Excel avançado", "Inglês técnico").
  Uma competência por item. Nunca junte várias numa string só, nunca quebre um nome composto
  ("Design Systems" é UM item, não dois).
- language: array de idiomas com nível quando informado ("Inglês - Avançado"). Só idiomas.
- education: array de { course, institution, period, status }.
- courses: array de strings com cursos livres e certificações.
- experience: array de { role, company, period, description }.
  - period é um texto único: "2022 - 2024", "2022 - Atual", "Conclusão: 2026".
  - description é SEMPRE array de strings, uma por responsabilidade. Nunca use "\\n" ou "-" dentro de uma string.
- confidence: número entre 0 e 1 avaliando quanto do currículo você conseguiu ler com clareza.
  Use 0.9+ para texto limpo e completo; 0.5-0.8 quando houver seções ilegíveis, layout confuso
  ou informação faltando; abaixo de 0.5 quando o arquivo mal se parece com um currículo.
  Este número precisa refletir a leitura real — não repita um valor fixo.

FORMATO (retorne exatamente estas chaves)
{"fullName":"","email":"","phones":[],"location":{"city":"","state":"","cep":""},"summary":"","qualifications":"","skills":[],"education":[],"courses":[],"experience":[],"language":[],"role":"","confidence":0}`;

function readPositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class OpenaiService {
  private readonly client: OpenAI;

  private readonly logger = new Logger(OpenaiService.name);

  private readonly costInputPerToken: number;
  private readonly costOutputPerToken: number;

  constructor(private readonly exchangeRateService: ExchangeRateService) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.costInputPerToken =
      readPositiveNumber(
        process.env.COST_INPUT,
        DEFAULT_COST_INPUT_PER_MILLION,
      ) / 1_000_000;

    this.costOutputPerToken =
      readPositiveNumber(
        process.env.COST_OUTPUT,
        DEFAULT_COST_OUTPUT_PER_MILLION,
      ) / 1_000_000;
  }

  async analyseResume(text: string): Promise<ResumeAnalysis> {
    this.logger.log('Iniciando análise de currículo com OpenAI');

    try {
      const completion = await this.client.chat.completions.create({
        model: RESUME_MODEL,
        response_format: {
          type: 'json_object',
        },
        temperature: 0,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          {
            role: 'system',
            content: EXTRACTION_CONTRACT,
          },
          {
            role: 'user',
            content: `Currículo:\n${text}`,
          },
        ],
      });

      const choice = completion.choices[0];

      if (choice.finish_reason === 'length') {
        throw new Error(
          'A resposta da IA foi truncada por exceder o limite de tokens. O currículo pode ser longo demais.',
        );
      }

      const raw = choice.message.content;

      const promptTokens = completion.usage?.prompt_tokens || 0;

      const completionTokens = completion.usage?.completion_tokens || 0;

      const costUsd =
        promptTokens * this.costInputPerToken +
        completionTokens * this.costOutputPerToken;

      const usdToBrl = await this.exchangeRateService.getUsdToBrl();

      const costBrl = costUsd * usdToBrl;

      const data = JSON.parse(raw || '{}') as ResumeData;

      this.logger.log(
        `Currículo analisado com sucesso | Tokens=${completion.usage?.total_tokens || 0} | Custo=R$${costBrl.toFixed(4)}`,
      );

      return {
        data,
        costBrl,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(
        'Erro ao analisar currículo com OpenAI',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }
}
