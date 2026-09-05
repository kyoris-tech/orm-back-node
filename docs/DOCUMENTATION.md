# Orm API — Documentação do Back

Referência viva do `orm-back-node`. Companheira da documentação do front, em
`orm-dashboard-front/docs/DOCUMENTATION.md`.

Há uma versão navegável em [`DOCUMENTATION.html`](./DOCUMENTATION.html), ao lado
deste arquivo — mesmo conteúdo, com índice fixo e busca. Ao mudar um, mude o outro.

**Leia as seções 1 a 4 antes de escrever qualquer código.** O resto é consulta.

---

## Índice

| # | Seção | Para quê |
|---|-------|----------|
| 1 | [Visão geral](#1-visão-geral) | O que é a API e quem fala com ela |
| 2 | [Como começar](#2-como-começar) | Subir a API na sua máquina |
| 3 | [Regras do código](#3-regras-do-código) | **Obrigatório.** O que pode e o que não pode |
| 4 | [Camadas e organização](#4-camadas-e-organização) | Clean architecture aplicada aqui |
| 5 | [Onde encontrar cada coisa](#5-onde-encontrar-cada-coisa) | "Preciso mexer em X, vou onde?" |
| 6 | [Ciclo de uma requisição](#6-ciclo-de-uma-requisição) | Do HTTP ao banco e de volta |
| 7 | [Autenticação e autorização](#7-autenticação-e-autorização) | Chave de API, JWT, papéis, rate limit |
| 8 | [Banco de dados](#8-banco-de-dados) | Modelos Prisma e relações |
| 9 | [Paginação](#9-paginação) | O contrato que o front consome |
| 10 | [Planos e limites](#10-planos-e-limites) | Como o plano bloqueia uso |
| 11 | [Análise de currículo por IA](#11-análise-de-currículo-por-ia) | OpenAI, custo, cotação |
| 12 | [Auditoria](#12-auditoria) | O que é registrado e como |
| 13 | [Mapa de endpoints](#13-mapa-de-endpoints) | As 48 rotas |
| 14 | [Guia dos módulos](#14-guia-dos-módulos) | O que cada módulo faz |
| 15 | [Receitas](#15-receitas) | Passo a passo para adicionar coisas |
| 16 | [Armadilhas e pendências](#16-armadilhas-e-pendências) | Erros conhecidos e dívidas abertas |
| 17 | [Antes de concluir](#17-antes-de-concluir) | Checklist de validação |

---

## 1. Visão geral

`orm-back-node` é a API da **Orm Intelligence**: regra de negócio, banco e a
integração com a OpenAI que faz a triagem de currículos.

### Quem chama esta API

| Cliente | Como |
|---|---|
| `orm-dashboard-front` | **Nunca do navegador.** Os Route Handlers do Next (BFF) chamam a API a partir do servidor deles |
| `orm-front-candidate` | front do candidato |
| Rotas públicas | `/api/v1/public/**` — sem sessão, chamadas direto |

Isso importa: o front do dashboard tem uma camada BFF na frente. Quando um dado
não aparece na tela, o problema pode estar **aqui** ou **no BFF do Next** — os
dois precisam ser conferidos.

### Stack

- **NestJS 11** + **TypeScript** (`strictNullChecks`)
- **Prisma 6** + **PostgreSQL**
- **Passport JWT** para sessão, **bcrypt** para senha
- **class-validator** / **class-transformer** nos DTOs
- **@nestjs/throttler** para rate limit
- **OpenAI** (`gpt-4.1-mini`), **pdf-parse** e **mammoth** para extração, **pdfkit** para gerar PDF
- **Swagger** em `/docs`, só fora de produção

### Prefixo global

Todas as rotas de negócio vivem sob **`/api/v1`**, aplicado uma única vez em
`main.ts` via `setGlobalPrefix`:

```ts
app.setGlobalPrefix(API_PREFIX, { exclude: ['/'] });
```

Os controllers declaram só o próprio caminho (`@Controller('users')`). A raiz
`/` fica de fora do prefixo — é o health check.

---

## 2. Como começar

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | Postgres |
| `JWT_SECRET` | sim | assinatura do token; **a aplicação se recusa a subir sem ela** |
| `OPENAI_API_KEY` | sim | análise de currículo |
| `OPENAI_RESUME_MODEL` | não | default `gpt-4.1-mini` |
| `COST_INPUT` / `COST_OUTPUT` | não | custo por milhão de tokens — **trocar junto com o modelo** (seção 11) |
| `USD_BRL` | não | fixa a cotação e desliga a busca automática |
| `CORS_ORIGINS` | não | lista separada por vírgula; sem ela usa os defaults de dev |
| `PORT` | não | default 3000 |

`JWT_SECRET` não tem fallback por decisão de segurança — ver `src/config/jwt.config.ts`.

### Scripts

| Comando | O quê |
|---|---|
| `npm run start:dev` | watch mode |
| `npm run build` | compila para `dist/` |
| `npm run lint` | ESLint **com `--fix`** (aplica o Prettier) |
| `npx tsc --noEmit` | checagem de tipos |
| `npm test` | testes unitários |
| `npx prisma studio` | inspecionar o banco |

### Por onde começar a ler

Nesta ordem, dá o modelo mental inteiro:

1. `src/main.ts` — prefixo, validação global, CORS, Swagger
2. `src/app.module.ts` — os módulos que existem
3. `src/modules/users/` — um módulo completo e pequeno, com as quatro camadas
4. `src/common/` — o que é compartilhado por todo mundo
5. `prisma/schema.prisma` — o domínio de dados

---

## 3. Regras do código

Iguais às do front, com o que é específico de Nest somado.

### 3.1 Idioma

- **Código em inglês**: variáveis, funções, classes, tipos, parâmetros, arquivos, pastas.
- **Português apenas no que sai para o cliente**: mensagens de exceção, textos de log.

```ts
throw new NotFoundException('Currículo não encontrado');
throw new ForbiddenException('Sem permissão para esta operação');
```

Mensagem de erro é interface de usuário — o front exibe ela crua. Escreva a
mensagem que a pessoa precisa ler, não o erro técnico.

### 3.2 Sem comentários

Não há um único comentário em `src/`. Se um trecho precisa de comentário, o
trecho está errado — extraia um método com nome descritivo ou nomeie a constante.

```ts
const RECENT_RESUMES_LIMIT = 3;
const TOKEN_EXPIRES_IN_SECONDS = 3600;
const MAX_COMPLETION_TOKENS = 3000;
```

Números mágicos viram constantes em `SCREAMING_SNAKE_CASE` no topo do arquivo.

### 3.3 Zero `any`

`src/` não tem **nenhum** `any` explícito, e é para continuar assim.

Isso não é preciosismo: `user: any` deixou passar para produção um bug em que
`user.id` (que não existe — o campo é `userId`) gravava `createdById` nulo em
todo currículo, em silêncio. Com `AuthenticatedUser` o compilador rejeita:

```
error TS2339: Property 'id' does not exist on type 'AuthenticatedUser'.
```

Quando um valor externo é realmente desconhecido, use `unknown` e estreite:

```ts
catch (error) {
  this.logger.error('...', error instanceof Error ? error.stack : String(error));
}
```

Na fronteira com o Prisma, `dataJson` é `Prisma.JsonValue` e o cast para o tipo
de domínio acontece na leitura — o cast fica **na fronteira**, não espalhado.

### 3.4 Nada de `@Req() req: any`

Handler nunca toca no `Request` cru para pegar o usuário. Use o decorator:

```ts
@Get('profile')
async getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
  return this.userService.getProfile(currentUser.userId);
}
```

### 3.5 Camadas

A dependência aponta **para dentro**. Detalhes na seção 4, mas em resumo:

- `domain/` não importa de `application/`, `infrastructure/` nem de Nest
- `presentation/` não fala com Prisma direto — chama o service
- `application/` não conhece `Request`, `Response` nem HTTP

### 3.6 Estilo

- Aspas simples, vírgula final, 80 colunas (Prettier via ESLint).
- Um módulo por domínio, registrado em `app.module.ts` (ou importado por quem precisa).
- Constantes de módulo no topo do arquivo, antes da classe.
- `import type { ... }` para imports que são só tipo.

### 3.7 Validação obrigatória

Lint, tipos, build e testes limpos. Detalhes na seção 17.

---

## 4. Camadas e organização

```
src/
  main.ts              bootstrap: prefixo, ValidationPipe, CORS, Swagger
  app.module.ts        composição dos módulos

  common/              compartilhado por todos os módulos
    decorators/          @CurrentUser, @Roles
    guards/              JwtAuthGuard, RolesGuard
    dto/                 PaginationQueryDto
    pagination/          parsePagination, buildPaginatedResult
    types/               AuthenticatedUser, UserRole

  config/              jwt.config.ts

  infrastructure/      infraestrutura transversal
    prisma/              PrismaService (@Global), PrismaModule

  modules/<nome>/
    domain/              tipos e contratos — sem framework, sem Prisma
    application/         services = casos de uso
    infrastructure/      adaptadores: OpenAI, PDF, extractor, throttlers, stores
    presentation/        controller + dto/
    <nome>.module.ts
```

### A direção da dependência

```
presentation  →  application  →  domain
       ↓              ↓
        infrastructure
```

- **domain** é o núcleo. Só tipos e funções puras. Não importa nada de Nest, de
  Prisma nem de outra camada. É o que descreve o negócio.
- **application** orquestra: valida regra, chama o Prisma, registra auditoria.
- **infrastructure** é o que fala com o mundo: OpenAI, geração de PDF, extração
  de texto, cotação do dólar, o store em memória dos jobs de importação.
- **presentation** é a casca HTTP: rota, DTO de entrada, guard, decorator.

Um `domain/` que importa de `application/` é bug de arquitetura, não questão de
gosto — foi o que permitiu que `AuthUser` vivesse dentro de `jwt.strategy.ts`
enquanto metade do sistema dependia dele.

### Por que o Prisma não está atrás de repositórios

Escolha deliberada. Não há interfaces de repositório nem mappers entre domínio e
persistência: os services usam `PrismaService` direto. Para um CRUD deste
tamanho e sem suíte de testes que justifique a inversão, a indireção custaria
mais do que entrega. As camadas separam **responsabilidade e tipagem**, não
acesso a dados.

Se um dia existir necessidade real de trocar o ORM ou testar sem banco, o ponto
de corte já está desenhado: `application/` é a única camada que toca o Prisma.

### Anatomia de um módulo

```
modules/resumes/
  domain/
    resume-data.ts        ResumeData, ResumeExperience, ResumeSearchableFields
    resume-analysis.ts    ResumeAnalysis, ResumeAnalysisUsage
    upload-actor.ts       UploadActor
    bulk-upload.ts        BulkUploadItemResult, BulkUploadSummary
  application/
    resumes.service.ts    busca, ranking, soft/hard delete, restore
    upload.service.ts     upload individual e em lote
  infrastructure/
    openai/               chamada e contrato do prompt
    extractor/            PDF e DOCX → texto
    pdf/                  geração do PDF com marca d'água
    bulk/                 store em memória dos jobs
  presentation/
    resumes.controller.ts
    dto/
  resumes.module.ts
```

---

## 5. Onde encontrar cada coisa

| Você quer... | Vá para |
|---|---|
| Mudar o prefixo, CORS, validação global, Swagger | `src/main.ts` |
| Adicionar um módulo ao app | `src/app.module.ts` |
| Mudar o formato de paginação | `src/common/pagination/pagination.ts` |
| Mudar o tipo do usuário autenticado | `src/common/types/authenticated-user.ts` |
| Mudar como o papel é verificado | `src/common/guards/roles.guard.ts` |
| Mudar as mensagens de erro de token | `src/common/guards/jwt-auth.guard.ts` |
| Mudar o segredo/expiração do JWT | `src/config/jwt.config.ts` e `modules/auth/auth.module.ts` |
| Mudar o payload do login | `modules/auth/domain/login-result.ts` |
| Mexer em empresas, plano da empresa, token de API | `modules/companies/` |
| Mexer em usuários, senha, bloqueio, exportação | `modules/users/` |
| Mexer nos planos e nos limites | `modules/plans/` |
| Mexer no upload / importação de currículo | `modules/resumes/application/upload.service.ts` |
| Mexer na busca e no cálculo de aderência | `modules/resumes/application/resumes.service.ts` |
| Mexer no prompt da IA ou no custo | `modules/resumes/infrastructure/openai/openai.service.ts` |
| Mexer no PDF do currículo | `modules/resumes/infrastructure/pdf/resume-pdf.service.ts` |
| Mexer em vagas e no link público | `modules/job-openings/` |
| Mexer em processos seletivos e candidatos | `modules/selection-processes/` |
| Mexer no log de auditoria | `modules/audit-logs/` |
| Mexer na cotação do dólar | `modules/exchange-rate/` |
| Mudar o modelo de dados | `prisma/schema.prisma` + migration |

### Como buscar

```bash
grep -rn "assertFeatureEnabled" src      # onde o plano bloqueia
grep -rn "auditLogService.create" src    # o que é auditado
grep -rn "@Roles(" src                   # o que exige papel específico
grep -rn "parsePagination" src           # o que é paginado
```

Padrões de nome que valem sempre:

| Padrão | Papel |
|---|---|
| `<nome>.controller.ts` | rota HTTP, em `presentation/` |
| `<nome>.service.ts` | caso de uso, em `application/` |
| `<nome>.module.ts` | composição, na raiz do módulo |
| `*.dto.ts` | entrada HTTP validada, em `presentation/dto/` |
| `*.types.ts` / nomes de domínio | contratos, em `domain/` |
| `*.guard.ts` / `*.strategy.ts` | infraestrutura de auth |

---

## 6. Ciclo de uma requisição

`GET /api/v1/users?page=1&pageSize=10`, do HTTP ao banco:

```
1. proxy do Next (BFF)        repassa com Authorization: Bearer
2. ThrottlerModule            rate limit global
3. JwtAuthGuard               valida o token, popula request.user
4. RolesGuard                 confere @Roles('admin')
5. ValidationPipe             valida e transforma ListUsersDto
6. UserController.listAll     presentation
7. UserService.listAll        application: monta o where, pagina
8. PrismaService              $transaction([findMany, count])
9. buildPaginatedResult       { data, pagination }
```

### Formato de um controller

```ts
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('admin')
  async listAll(@Query() query: ListUsersDto) {
    return this.userService.listAll(query);
  }

  @Patch(':id/status')
  @Roles('admin', 'mod')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.userService.updateStatus(id, dto.status, currentUser);
  }
}
```

Regras do controller: sem regra de negócio, sem Prisma, sem `req` cru. Ele
recebe, delega e devolve.

### ValidationPipe

Global, em `main.ts`:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

**`forbidNonWhitelisted: true` tem uma consequência que já mordeu:** qualquer
propriedade enviada que **não** tenha um decorator do class-validator no DTO faz
a requisição falhar com 400. Um DTO sem decorators rejeita *tudo* — ver a
pendência do `POST /resumes` na seção 16.

### Ordem das rotas

Rota específica antes de rota com parâmetro:

```ts
@Delete('admin/:id/permanent')   // antes
@Delete(':id')                   // depois
```

O mesmo vale para `@Post('link-candidate')` versus `@Post(':id/candidates')`.

---

## 7. Autenticação e autorização

### Duas credenciais no login

`POST /api/v1/auth/login` exige as duas:

| Credencial | Onde | Para quê |
|---|---|---|
| `x-api-key` | header | identifica a **empresa** |
| e-mail + senha | body | identifica a **pessoa** |

A empresa precisa estar `ACTIVE`, o usuário precisa estar `ACTIVE`, e o usuário
precisa pertencer àquela empresa. Falhar qualquer uma delas nega o login.

### O contrato de resposta

`LoginResult` (`modules/auth/domain/login-result.ts`) usa **snake_case** porque é
o contrato já consumido pelo front. Não é o estilo do resto do código — é
compatibilidade, e mudar quebra o login:

```ts
{
  access_token, token_type: 'bearer', expires_in,
  user: { id, name, email, company_id, company_name, role }
}
```

### O usuário autenticado

O JWT carrega `JwtPayload`; a strategy o converte em `AuthenticatedUser`, que é
o que circula pelo sistema:

```ts
interface AuthenticatedUser {
  userId: string;      // vem de payload.sub — NÃO existe campo "id"
  name: string;
  email: string;
  companyId: string;
  role: UserRole;      // 'admin' | 'mod' | 'recruiter'
}
```

Token expira em 1h.

### Papéis

`@Roles('admin')` no handler ou na classe; o `RolesGuard` compara com
`user.role`. Sem `@Roles`, qualquer usuário autenticado passa.

| Papel | Alcance |
|---|---|
| `admin` | administração: empresas, usuários, planos, auditoria, exclusão permanente |
| `mod` | pode alterar status de usuário da própria empresa, exceto de admins |
| `recruiter` | operação do dia a dia |

### Isolamento por empresa

Não é o guard que garante — é cada service, filtrando por `companyId` no `where`.
Ao escrever uma consulta nova, **o filtro por empresa é responsabilidade sua**.

### Rate limit

| Guard | Regra |
|---|---|
| Global (`ThrottlerModule`) | 5 requisições / 60s |
| `LoginThrottlerGuard` | agrupa por e-mail (cai para IP se não houver e-mail) |
| `PublicApplyThrottlerGuard` | agrupa por código da vaga; 30 candidaturas / 30min |

Agrupar o login por e-mail evita que uma rede inteira atrás do mesmo IP seja
bloqueada por causa de uma pessoa errando a senha.

---

## 8. Banco de dados

PostgreSQL via Prisma. Schema em `prisma/schema.prisma`.

### Modelos

| Modelo | Papel |
|---|---|
| `Plan` | limites (`maxUsers`, `maxResumesPerMonth`) e `features[]` |
| `Company` | empresa cliente; tem `apiKey` única e um `Plan` |
| `User` | pessoa; pertence a uma `Company` e tem um `Role` |
| `Role` | `admin`, `mod`, `recruiter` |
| `Resume` | currículo importado; `dataJson` guarda a extração da IA |
| `JobOpening` | vaga; tem `publicCode` único para o link público |
| `SelectionProcess` | processo seletivo; pode estar ligado a uma vaga |
| `SelectionProcessCandidate` | tabela de ligação processo ↔ currículo, com `matchScore` |
| `AuditLog` | trilha de auditoria |

### Enums

- `Status`: `ACTIVE`, `INACTIVE`, `BLOCKED`, `PENDING`, `DELETED`
- `SelectionProcessStatus`: `OPEN`, `CLOSED`, `CANCELLED`, `CONCLUDED`
- `JobOpeningStatus`: `OPEN`, `CLOSED`, `CANCELLED`
- `WorkModel`: `REMOTE`, `HYBRID`, `ONSITE`
- `ContractType`: `CLT`, `PJ`, `INTERNSHIP`, `TEMPORARY`

### Exclusão

Nada some de verdade, com uma exceção:

- **Currículo**: soft delete via `deletedAt`; toda consulta filtra `deletedAt: null`. Só `admin` faz hard delete, em `DELETE /resumes/admin/:id/permanent`.
- **Usuário**: soft delete via `status: 'DELETED'`; as listagens excluem esse status.
- **Processo e vaga**: mudam de status (`CANCELLED`, `CLOSED`), nunca são apagados.

### PrismaService

`@Global()` — não precisa importar `PrismaModule` em cada módulo, embora vários
ainda importem explicitamente.

---

## 9. Paginação

Contrato único, em `src/common/pagination/pagination.ts`, consumido tal e qual
pelo front:

```ts
{
  data: T[],
  pagination: { page, pageSize, totalItems, totalPages }
}
```

```ts
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 2000;
```

`parsePagination` é tolerante de propósito: valor ausente, zero, negativo ou não
numérico cai no default, e `pageSize` é limitado a `MAX_PAGE_SIZE`. Requisição
malformada não derruba a consulta.

O front pede a lista inteira mandando `pageSize=2000` — é o `ALL_ITEMS_PAGE_SIZE`
dele. Por isso `MAX_PAGE_SIZE` **não pode ser reduzido** sem quebrar os selects
e as métricas do dashboard.

### O padrão no service

```ts
const { page, pageSize, skip, take } = parsePagination(query.page, query.pageSize);

const [items, totalItems] = await this.prisma.$transaction([
  this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  this.prisma.user.count({ where }),
]);

return buildPaginatedResult(items, totalItems, page, pageSize);
```

O `$transaction` importa: garante que a página e a contagem enxerguem o mesmo
estado do banco.

### A exceção: busca de currículos

`findAllWithCompatibility` **não** pagina no banco. Ele carrega os currículos da
empresa, calcula a aderência de cada um, ordena por ela e só então fatia a
página. Não tem como ser diferente: a ordenação depende de um cálculo que o
Postgres não conhece.

Isso é aceitável no volume atual e é o primeiro lugar a doer quando uma empresa
tiver dezenas de milhares de currículos.

### Filtro é sempre no servidor

Filtrar no cliente com paginação no servidor quebra a contagem — uma página de
10 exibiria 7, com o total dizendo outra coisa. Todo filtro de lista entra no
`where`.

---

## 10. Planos e limites

`PlanLimitsService` (`modules/plans/application/`) é o guardião. Três asserções,
chamadas pelos services antes de agir:

| Método | Onde é chamado | Bloqueia |
|---|---|---|
| `assertCanCreateUser` | criação de usuário | acima de `maxUsers` ativos |
| `assertCanProcessResume` | todo upload de currículo | acima de `maxResumesPerMonth` |
| `assertFeatureEnabled` | criação de vaga e de processo | recurso fora do plano |

`maxUsers` ou `maxResumesPerMonth` em `null` significa **ilimitado** — a asserção
retorna cedo.

Features possíveis: `jobOpenings`, `selectionProcesses`, `reports`.

A cota de currículos é mensal e conta a partir de `startOfCurrentMonth()`, que
usa **UTC** — o mês vira à meia-noite UTC, não no horário de Brasília.

`GET /companies/me/plan` devolve o uso atual; é o que alimenta o card de plano e
o `PlanFeatureGate` do front.

---

## 11. Análise de currículo por IA

Fluxo do upload (`UploadService.upload`):

```
1. valida arquivo e mimetype (PDF, DOC, DOCX)
2. assertCanProcessResume(companyId)
3. ExtractorService: pdf-parse ou mammoth → texto
4. OpenaiService.analyseResume: texto → ResumeData + custo
5. grava Resume com dataJson, confidence, processingMs, costBrl
```

### O prompt

`EXTRACTION_CONTRACT` é o system message, em
`modules/resumes/infrastructure/openai/openai.service.ts`. Roda com
`temperature: 0` e `response_format: json_object`.

Regras que existem por um motivo específico:

- **`skills`**: uma competência por item, e nunca quebrar nome composto —
  "Design Systems" é um item só, senão o filtro de habilidades pontua errado.
- **`confidence`**: precisa refletir a leitura real. O formato antigo trazia o
  literal `"confidence": 0.9` como exemplo, e o modelo simplesmente copiava —
  **todos os currículos da base tinham exatamente 0.9**. Hoje o contrato descreve
  os critérios em vez de mostrar um número.

Resposta truncada é tratada explicitamente: se `finish_reason === 'length'`, o
serviço lança erro em vez de deixar o `JSON.parse` estourar com uma mensagem
incompreensível.

### Custo

```ts
const RESUME_MODEL = process.env.OPENAI_RESUME_MODEL ?? 'gpt-4.1-mini';
const DEFAULT_COST_INPUT_PER_MILLION = 0.4;
const DEFAULT_COST_OUTPUT_PER_MILLION = 1.6;
```

**Modelo e preço moram no mesmo arquivo e precisam ser trocados juntos.** Já
divergiram uma vez: o código chamava `gpt-4.1-mini` mas calculava com preço de
`gpt-4o-mini`, e o custo saía subestimado em ~2,4×.

Preços por milhão de tokens, para referência:

| Modelo | Input | Output |
|---|---|---|
| `gpt-4.1-mini` | 0.40 | 1.60 |
| `gpt-4o-mini` | 0.15 | 0.60 |
| `gpt-4o` | 2.50 | 10.00 |

Se `COST_INPUT`/`COST_OUTPUT` estiverem setados no ambiente, eles vencem os
defaults — **inclusive em produção**. Um valor velho no Railway sobrescreve o
código em silêncio.

### Cotação do dólar

`ExchangeRateService` resolve `USD → BRL` nesta ordem:

```
USD_BRL do ambiente  →  cache (6h)  →  AwesomeAPI  →  último cache  →  5.12
```

A taxa buscada só é aceita se estiver entre 1 e 20; fora disso é descartada como
implausível. Timeout de 3s. Nada disso derruba a análise: no pior caso usa o
fallback e loga um warning.

### Importação em lote

`POST /resumes/upload/bulk/start` devolve um `jobId` na hora e processa em
background. O progresso vive em memória (`bulkJobs`), com TTL de 10 minutos, e é
consultado em `GET /resumes/upload/bulk/status/:jobId` — que confere dono e
empresa antes de responder.

Consequência de ser memória: **o progresso não sobrevive a restart nem a
múltiplas instâncias.** Com mais de um processo servindo a API, o status precisa
sair para Redis ou para o banco.

---

## 12. Auditoria

`AuditLogService.create` grava um `AuditLog`. Campos:

| Campo | Conteúdo |
|---|---|
| `entityType` | `USER`, `COMPANY`, `resume`, ... |
| `entityId` | id do registro afetado |
| `action` | `UPDATE_STATUS`, `SOFT_DELETE`, `RESTORE`, `DOWNLOAD`, ... |
| `oldValue` / `newValue` | texto ou JSON serializado |
| `performedByUserId` / `performedByName` | quem fez |

É auditado: mudança de status e senha de usuário, alterações de empresa
(nome, plano, dados, token), ciclo de vida de processos e vagas, e as ações
destrutivas ou sensíveis sobre currículo (soft delete, hard delete, restore,
download de PDF).

Duas inconsistências conhecidas estão na seção 16.

---

## 13. Mapa de endpoints

48 rotas. Tudo sob `/api/v1`, exceto o health check.

### Público — sem autenticação

| Método | Rota |
|---|---|
| GET | `/` — health check |
| POST | `/api/v1/auth/login` |
| GET | `/api/v1/public/job-openings` |
| GET | `/api/v1/public/job-openings/:code` |
| POST | `/api/v1/public/job-openings/:code/apply` |

### Currículos

| Método | Rota | Papel |
|---|---|---|
| GET | `/api/v1/resumes` | autenticado |
| POST | `/api/v1/resumes` | autenticado — **ver seção 16** |
| GET | `/api/v1/resumes/recent` | autenticado |
| POST | `/api/v1/resumes/upload` | autenticado |
| POST | `/api/v1/resumes/upload/bulk` | autenticado |
| POST | `/api/v1/resumes/upload/bulk/start` | autenticado |
| GET | `/api/v1/resumes/upload/bulk/status/:jobId` | autenticado |
| GET | `/api/v1/resumes/:id/pdf` | autenticado |
| PATCH | `/api/v1/resumes/:id/restore` | autenticado |
| DELETE | `/api/v1/resumes/:id` | autenticado |
| DELETE | `/api/v1/resumes/admin/:id/permanent` | `admin` |

### Vagas

| Método | Rota |
|---|---|
| GET / POST | `/api/v1/job-openings` |
| GET / PATCH | `/api/v1/job-openings/:id` |
| PATCH | `/api/v1/job-openings/:id/cancel` |

### Processos seletivos

| Método | Rota |
|---|---|
| GET / POST | `/api/v1/selection-processes` |
| GET | `/api/v1/selection-processes/:id` |
| POST | `/api/v1/selection-processes/:id/candidates` |
| POST | `/api/v1/selection-processes/link-candidate` |
| PATCH | `/api/v1/selection-processes/:id/cancel` |
| PATCH | `/api/v1/selection-processes/:id/close` |
| PATCH | `/api/v1/selection-processes/:id/conclude` |
| PATCH | `/api/v1/selection-processes/:id/job-opening` |

### Empresas

| Método | Rota | Papel |
|---|---|---|
| GET / POST | `/api/v1/companies` | `admin` |
| GET | `/api/v1/companies/me/plan` | autenticado |
| PATCH | `/api/v1/companies/:id` | `admin` |
| PATCH | `/api/v1/companies/:id/plan` | `admin` |
| PATCH | `/api/v1/companies/:id/status` | `admin` |
| POST | `/api/v1/companies/:id/regenerate-token` | `admin` |

### Usuários

| Método | Rota | Papel |
|---|---|---|
| GET / POST | `/api/v1/users` | `admin` |
| GET | `/api/v1/users/profile` | autenticado |
| GET | `/api/v1/users/export` | `admin` |
| PATCH | `/api/v1/users/:id/status` | `admin`, `mod` |
| PATCH | `/api/v1/users/:id/password` | `admin` |

### Administração

| Método | Rota | Papel |
|---|---|---|
| GET | `/api/v1/admin/audit-logs` | `admin` |
| GET / POST | `/api/v1/admin/plans` | `admin` |
| PATCH / DELETE | `/api/v1/admin/plans/:id` | `admin` |

---

## 14. Guia dos módulos

| Módulo | O que faz | Comece por |
|---|---|---|
| `health` | health check em `/`, fora do prefixo | `presentation/health.controller.ts` |
| `auth` | login com dupla credencial, JWT, strategy | `application/auth.service.ts` |
| `users` | CRUD, senha, bloqueio, exportação LGPD | `application/user.service.ts` |
| `companies` | empresa, plano, status, token de API | `application/company.service.ts` |
| `plans` | CRUD de planos e as asserções de limite | `application/plan-limits.service.ts` |
| `resumes` | upload, extração, IA, busca com aderência, PDF | `application/upload.service.ts` |
| `job-openings` | vagas, link público, candidatura | `application/job-opening.service.ts` |
| `selection-processes` | ciclo de vida, candidatos, matching | `application/selection-process.service.ts` |
| `audit-logs` | escrita e listagem da trilha | `application/audit-log.service.ts` |
| `exchange-rate` | cotação USD→BRL com cache e fallback | `application/exchange-rate.service.ts` |

### Notas por módulo

**`resumes`** — o mais denso. A busca calcula aderência dividindo termos por
vírgula; cada termo é comparado como frase inteira contra campos derivados do
`dataJson` (habilidades, cargo, cidade, formação, idiomas). A nota é
`termos atendidos / termos pedidos`. Os filtros **ordenam, não excluem**: quem
tem 0% continua na lista, no fim.

**`selection-processes`** — concentra as regras de estado mais delicadas.
Concluir um processo exige que o candidato selecionado faça parte dele; encerrar
um processo pode encerrar a vaga vinculada, se não sobrar nenhum processo aberto
nela. `attachPublicApplication` é o caminho da candidatura pública: acha ou cria
o processo da vaga e anexa o currículo com o `matchScore` calculado.

**`job-openings`** — `publicCode` é gerado com retentativa até não colidir
(`createWithUniquePublicCode`). O controller público é o único sem
`requireSession`, e é onde o throttler por código atua.

**`users`** — `exportAll` cruza usuários com o log de auditoria para descobrir
quando e por quem cada um foi bloqueado ou excluído. É o relatório de LGPD.

---

## 15. Receitas

### 15.1 Novo endpoint em módulo existente

1. DTO em `presentation/dto/`, com decorators do class-validator (**sem eles a rota rejeita tudo**).
2. Método no service, em `application/`.
3. Handler no controller, com `@CurrentUser()` se precisar do usuário.
4. `@Roles(...)` se exigir papel.
5. Filtre por `companyId` na consulta.
6. Registre auditoria se a ação for destrutiva ou sensível.

### 15.2 Novo módulo

```
modules/<nome>/
  domain/           tipos do negócio
  application/      <nome>.service.ts
  presentation/     <nome>.controller.ts + dto/
  <nome>.module.ts
```

Registre em `src/app.module.ts`. Importe `PlansModule` se precisar das
asserções de limite e `AuditLogModule` se for auditar.

### 15.3 Nova listagem paginada

1. `PaginationQueryDto` (ou um DTO que o estenda) no `@Query()`.
2. `parsePagination` no service.
3. `$transaction([findMany, count])`.
4. `buildPaginatedResult`.
5. No BFF do Next, **repasse os query params** — sem isso a paginação é ignorada em silêncio.

### 15.4 Novo campo no banco

1. Edite `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <descrição>`.
3. `npx prisma generate`.
4. Atualize DTO e tipos de domínio.
5. Se for exibido, alinhe com os tipos do front.

### 15.5 Novo limite de plano

1. Campo em `Plan` no schema + migration.
2. `assertCanX` em `PlanLimitsService`, com mensagem em português dizendo o limite e o caminho de saída.
3. Chame a asserção no service, **antes** de gravar.
4. Inclua no retorno de `getUsage` se o front for exibir.

---

## 16. Armadilhas e pendências

### Armadilhas

**DTO sem decorators rejeita tudo.** Com `forbidNonWhitelisted: true`, uma
propriedade sem decorator do class-validator gera
`"property X should not exist"` e a requisição inteira falha com 400.

**`AuthenticatedUser` não tem `id`.** O campo é `userId`. Escrever `user.id` hoje
não compila — e é assim de propósito (seção 3.3).

**Isolamento por empresa é manual.** Nenhum guard filtra por `companyId`. Toda
consulta nova precisa do filtro no `where`.

**`MAX_PAGE_SIZE` é contrato.** O front pede `pageSize=2000` para carregar listas
completas em selects e métricas. Reduzir esse teto trunca a interface dele.

**Modelo e custo da IA andam juntos.** Trocar `OPENAI_RESUME_MODEL` sem trocar
`COST_INPUT`/`COST_OUTPUT` faz o custo registrado ficar errado, sem nenhum sinal.

**Env vence código.** `COST_INPUT`, `COST_OUTPUT` e `USD_BRL` setados no ambiente
sobrescrevem os defaults. Verifique o Railway antes de concluir que o código está
errado.

**Progresso do bulk é memória local.** Não sobrevive a restart nem funciona com
mais de uma instância.

**Ordem das rotas.** Caminho específico antes de caminho com parâmetro.

**`npm run lint` reescreve arquivos.** Roda com `--fix`. É o esperado — é assim
que o Prettier é aplicado.

### Pendências abertas

Três coisas identificadas e **deliberadamente não corrigidas**, porque mudariam
comportamento ou dados:

**1. `POST /api/v1/resumes` está quebrado.** `CreateResumeDto` não tem nenhum
decorator do class-validator, então o `ValidationPipe` rejeita todas as
propriedades e a rota sempre responde 400. O front não usa esse endpoint, por
isso passou despercebido. Decida se ele deve ganhar validação ou ser removido.

**2. `performedByName` é inconsistente na auditoria.** Soft delete e download de
currículo gravam o **e-mail** de quem fez; hard delete e restore gravam o
**nome**. Mesma coluna, e o front exibe ela direto. Corrigir muda o que é gravado
daqui pra frente e não reescreve o histórico.

**3. `npm run start:prod` aponta para o caminho errado.** O script roda
`node dist/main`, mas o build gera `dist/src/main.js` — o `tsconfig.json` não tem
`include`, então `prisma/` e `generated/` entram na compilação e empurram o
`rootDir` para a raiz do projeto. Não foi alterado porque, se o deploy já
convive com esse layout, mudá-lo quebraria a produção. Confirme como o Railway
inicia a aplicação antes de mexer.

### Melhoria sugerida, não aplicada

Não há `@nestjs/config`: as variáveis de ambiente são lidas com `process.env`
espalhado por alguns arquivos (`openai.service`, `exchange-rate.service`,
`main.ts`), sem validação de schema no boot — exceto `JWT_SECRET`, `DATABASE_URL`
e `API_KEY`, que falham cedo. Centralizar num `ConfigModule` tipado tornaria o
boot mais previsível.

---

## 17. Antes de concluir

Os quatro, limpos:

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npm run build
```

```bash
npm test
```

Antes de abrir um PR:

- Nenhum comentário novo em `src/`
- Nenhum `any` novo — `unknown` + estreitamento quando o valor for externo
- Nenhum identificador em português; mensagens de erro **em** português
- Handler novo usa `@CurrentUser()`, nunca `@Req() req: any`
- Consulta nova filtra por `companyId`
- Listagem nova usa `parsePagination` + `buildPaginatedResult`
- Ação destrutiva ou sensível registra auditoria
- DTO novo tem decorators do class-validator em **todas** as propriedades
- Se a rota mudou: o BFF do front foi ajustado junto
- Se o comportamento do produto mudou: esta documentação foi atualizada junto
