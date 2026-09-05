import {
  Injectable,
  Logger,
} from '@nestjs/common';
import OpenAI from 'openai';
import { ExchangeRateService } from '../../exchange-rate/exchange-rate.service';

const RESUME_MODEL = process.env.OPENAI_RESUME_MODEL ?? 'gpt-4.1-mini';

const DEFAULT_COST_INPUT_PER_MILLION = 0.4;
const DEFAULT_COST_OUTPUT_PER_MILLION = 1.6;

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class OpenaiService {
  private readonly client: OpenAI;

  private readonly logger =
    new Logger(OpenaiService.name);

  private readonly costInputPerToken: number;
  private readonly costOutputPerToken: number;

  constructor(private readonly exchangeRateService: ExchangeRateService) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.costInputPerToken =
      readPositiveNumber(process.env.COST_INPUT, DEFAULT_COST_INPUT_PER_MILLION) / 1_000_000;

    this.costOutputPerToken =
      readPositiveNumber(process.env.COST_OUTPUT, DEFAULT_COST_OUTPUT_PER_MILLION) / 1_000_000;
  }

  async analyseResume(text: string) {
    this.logger.log(
      'Iniciando análise de currículo com OpenAI',
    );

    const prompt = `
      Extraia SOMENTE informações presentes no currículo e retorne um JSON estruturado corretamente.

      REGRAS IMPORTANTES:

      - Não invente dados
      - Não normalize textos
      - Não alterar e-mails, telefones ou datas
      - Se não existir no currículo, deixe vazio
      - Sempre retornar JSON válido
      - Nunca retornar texto fora do JSON

      REGRAS DE ESTRUTURA:

      1. Para experiências profissionais:
      - usar "period" ao invés de "start" e "end"
      - exemplo: "2022 - 2024" ou "Conclusão: 2026"

      2. Para descrições de experiência:
      - se houver múltiplos itens, bullet points, traços (-), responsabilidades ou listas,
      retorne SEMPRE como array de strings em "description"

      Exemplo correto:

      "description": [
        "Desenvolvimento de interfaces com React",
        "Integração com APIs REST",
        "Criação de testes unitários"
      ]

      Nunca retornar:

      "description": "- item 1\\n- item 2"

      3. Para educação:
      - usar "period"
      - usar:
      {
        "course": "",
        "institution": "",
        "period": "",
        "status": ""
      }

      4. Para experience:
      usar:

      {
        "role": "",
        "company": "",
        "period": "",
        "description": []
      }

      5. Para courses:
      - retornar como array simples de strings

      6. Para skills:
      - retornar como array simples de strings

      7. Para qualifications:
      - manter como texto corrido se não houver divisão clara

      Formato obrigatório:

      {
        "fullName": "",
        "email": "",
        "phones": [],
        "location": {
          "city": "",
          "state": "",
          "cep": ""
        },
        "summary": "",
        "qualifications": "",
        "skills": [],
        "education": [],
        "courses": [],
        "experience": [],
        "language": [],
        "role": "",
        "confidence": 0.9
      }

      Currículo:
      ${text}
      `;

    try {
      const completion =
        await this.client.chat.completions.create({
          model: RESUME_MODEL,
          response_format: {
            type: 'json_object',
          },
          messages: [
            {
              role: 'system',
              content:
                'Você é um analisador de currículos que retorna JSON válido.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

      const raw =
        completion.choices[0].message.content;

      const promptTokens =
        completion.usage?.prompt_tokens || 0;

      const completionTokens =
        completion.usage?.completion_tokens || 0;

      const costUsd =
        (promptTokens * this.costInputPerToken) +
        (completionTokens * this.costOutputPerToken);

      const usdToBrl =
        await this.exchangeRateService.getUsdToBrl();

      const costBrl =
        costUsd * usdToBrl;

      const data =
        JSON.parse(raw || '{}');

      this.logger.log(
        `Currículo analisado com sucesso | Tokens=${completion.usage?.total_tokens || 0} | Custo=R$${costBrl.toFixed(4)}`,
      );

      return {
        data,
        costBrl,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens:
            completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      this.logger.error(
        'Erro ao analisar currículo com OpenAI',
        error?.stack || error?.message,
      );

      throw error;
    }
  }
}