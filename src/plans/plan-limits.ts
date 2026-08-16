export type PlanFeature = 'jobOpenings' | 'selectionProcesses' | 'reports';

export const ALL_PLAN_FEATURES: PlanFeature[] = ['jobOpenings', 'selectionProcesses', 'reports'];

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  jobOpenings: 'Vagas publicadas',
  selectionProcesses: 'Processos seletivos',
  reports: 'Relatórios',
};

export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
