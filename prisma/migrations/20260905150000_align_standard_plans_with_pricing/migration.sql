-- Alinha os planos padrão com a tabela de preços publicada na landing.
--
-- Estratégia: os três planos existentes são renomeados NO LUGAR, mantendo o mesmo id.
-- Nenhuma empresa troca de plano e nenhum limite diminui:
--
--   Básico (2 usuários / 50 currículos)  -> Essencial     (3 / 100)
--   Pro    (10 usuários / 500 currículos) -> Profissional (15 / 600)
--   Enterprise (ilimitado)                -> Enterprise   (inalterado)
--   (novo)                                -> Business     (ilimitado / 2.000)
--
-- Os ids abaixo vêm da migration 20260816145544_dynamic_plans_and_company_fields,
-- que semeou os planos com uuid fixo em todos os ambientes.
--
-- As cláusulas NOT EXISTS evitam violação da constraint única de "name" caso
-- algum ambiente já tenha um plano com o nome de destino criado manualmente.

-- Básico -> Essencial
UPDATE "Plan"
SET "name" = 'Essencial',
    "maxUsers" = 3,
    "maxResumesPerMonth" = 100,
    "features" = ARRAY[]::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '37f0733d-1c21-4053-9fb1-b1b3aa3eacc9'
  AND NOT EXISTS (
    SELECT 1 FROM "Plan" AS existing
    WHERE existing."name" = 'Essencial'
      AND existing."id" <> '37f0733d-1c21-4053-9fb1-b1b3aa3eacc9'
  );

-- Pro -> Profissional
UPDATE "Plan"
SET "name" = 'Profissional',
    "maxUsers" = 15,
    "maxResumesPerMonth" = 600,
    "features" = ARRAY['jobOpenings', 'selectionProcesses', 'reports'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '6d70af91-9ae7-4cd1-a72c-7a4c4831aa68'
  AND NOT EXISTS (
    SELECT 1 FROM "Plan" AS existing
    WHERE existing."name" = 'Profissional'
      AND existing."id" <> '6d70af91-9ae7-4cd1-a72c-7a4c4831aa68'
  );

-- Enterprise: normaliza limites e recursos (nome permanece)
UPDATE "Plan"
SET "maxUsers" = NULL,
    "maxResumesPerMonth" = NULL,
    "features" = ARRAY['jobOpenings', 'selectionProcesses', 'reports'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'e68b9a6a-cca9-4c16-8150-dcdeaa7207b4';

-- Business: novo degrau entre Profissional e Enterprise
INSERT INTO "Plan" ("id", "name", "maxUsers", "maxResumesPerMonth", "features", "updatedAt")
VALUES (
    '8c2ad582-2eaf-4f45-b31d-f57262977a26',
    'Business',
    NULL,
    2000,
    ARRAY['jobOpenings', 'selectionProcesses', 'reports'],
    CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;
