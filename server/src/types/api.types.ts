export interface ApiSuccess<T> {
  data: T
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { data }
}
