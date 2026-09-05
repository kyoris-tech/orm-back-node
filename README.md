# ORM Intelligence — Backend

Backend principal da plataforma **ORM Intelligence**, focada em análise inteligente de currículos com IA, matching de candidatos e recrutamento orientado por dados.

**[docs/DOCUMENTATION.md](./docs/DOCUMENTATION.md) é a referência deste projeto**:
regras de código, camadas, autenticação, paginação, mapa de endpoints e receitas.
Leia as seções 1 a 4 antes de escrever código. Há uma versão navegável em
[docs/DOCUMENTATION.html](./docs/DOCUMENTATION.html).

Este projeto utiliza:

- NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication
- OpenAI Integration
- Audit Logs
- Multi-tenant Architecture

---

# Pré-requisitos

Antes de iniciar, certifique-se de possuir instalado:

- Node.js
- npm
- PostgreSQL
- Prisma CLI

---

# Variáveis de Ambiente

Crie um arquivo:

```env
.env
```

com as variáveis:

```env
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
PORT=
```

Exemplo:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orm_dev"
JWT_SECRET="your_secret_here"
OPENAI_API_KEY="your_openai_key"
PORT=3000
```

---

# Instalação

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Gerar Prisma Client

```bash
npx prisma generate
```

---

## 3. Executar migrations

```bash
npx prisma migrate dev
```

Caso precise criar uma nova migration:

```bash
npx prisma migrate dev --name nome_da_migration
```

---

## 4. Rodar o projeto

```bash
npm run start:dev
```

O backend iniciará em:

```text
http://localhost:3000
```

---

# Fluxo de Login

Após autenticação:

```text
POST /api/v1/auth/login
↓
GET /api/v1/users/profile
```

O frontend utiliza esse fluxo para montar a sessão do usuário.

---

# Observações importantes

## Prisma utiliza camelCase

Sempre utilizar:

```ts
createdAt
fileName
processingMs
costBrl
dataJson
```

e nunca:

```ts
created_at
file_name
processing_ms
cost_brl
data_json
```

---

## Não subir para o Git

Nunca versionar:

```text
dist/
node_modules/
.env
```

Esses arquivos devem permanecer no `.gitignore`.

---

# Comandos úteis

## Resetar banco local

```bash
npx prisma migrate reset
```

---

## Visualizar banco com Prisma Studio

```bash
npx prisma studio
```

---

## Regerar Prisma após alteração no schema

```bash
npx prisma generate
```

---

# Branch recomendada

Fluxo sugerido:

```text
feature/*
↓
pull request
↓
review
↓
merge
```

Evitar commits diretos na `main/master`.

---
