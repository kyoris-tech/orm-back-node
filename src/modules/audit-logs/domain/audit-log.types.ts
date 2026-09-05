export interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  performedByUserId: string;
  performedByName: string;
}

export interface ListAuditLogsFilters {
  entityType?: string;
  page?: string;
  pageSize?: string;
}
