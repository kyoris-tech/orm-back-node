export interface BulkJob {
  ownerId: string;
  companyId: string;
  total: number;
  processed: number;
  processing: number;
  errors: number;
  done: boolean;
}

export const bulkJobs: Record<string, BulkJob> = {};

const JOB_TTL_MS = 10 * 60 * 1000;

export function scheduleBulkJobCleanup(jobId: string) {
  setTimeout(() => {
    delete bulkJobs[jobId];
  }, JOB_TTL_MS).unref?.();
}
