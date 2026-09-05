export interface BulkUploadItemResult {
  fileName: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface BulkUploadSummary {
  total: number;
  processed: number;
  results: BulkUploadItemResult[];
}
