export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(message = "Resource not found"): AppError {
  return new AppError(404, "NOT_FOUND", message);
}

export function forbidden(message = "You do not have access to this resource"): AppError {
  return new AppError(403, "FORBIDDEN", message);
}

export function unauthorized(message = "Authentication required"): AppError {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function conflict(message: string): AppError {
  return new AppError(409, "CONFLICT", message);
}

export function routeParam(value: string | string[] | undefined, name = "id"): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    throw badRequest(`Missing ${name}`);
  }
  return raw;
}
