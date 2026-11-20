export class ServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isServiceError(err: unknown): err is ServiceError {
  return err instanceof ServiceError;
}
