/**
 * Base IPC Contract Interface
 * Ensures type-safe communication between Main and Renderer processes
 */

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface IPCContract<TRequest = void, TResponse = void> {
  channel: string;
  validator?: (data: unknown) => data is TRequest;
}

export type IPCHandler<TRequest, TResponse> = (
  request: TRequest,
  userId?: string
) => Promise<IPCResponse<TResponse>>;

/**
 * Helper to create successful IPC response
 */
export function createSuccessResponse<T>(data: T): IPCResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Helper to create error IPC response
 */
export function createErrorResponse<T>(
  message: string,
  code?: string,
  details?: unknown
): IPCResponse<T> {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
}

/**
 * Pagination request interface
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination response interface
 */
export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
