export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 2000;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface PaginationParams {
  page?: string | number;
  pageSize?: string | number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function parsePagination(
  rawPage?: string | number,
  rawPageSize?: string | number,
) {
  const page = Math.max(1, Math.trunc(Number(rawPage)) || 1);
  const requestedPageSize =
    Math.trunc(Number(rawPageSize)) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, requestedPageSize), MAX_PAGE_SIZE);

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginatedResult<T>(
  data: T[],
  totalItems: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
}
