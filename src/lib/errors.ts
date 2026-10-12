/**
 * Standardized Application & API Error Architecture
 *
 * Provides:
 * - Structured typed API error schemas
 * - Machine-readable error codes
 * - Request correlation ID generation
 * - Sensitive data redaction for production log hygiene
 */

export type StandardErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SESSION_EXPIRED"
  | "RATE_LIMIT_EXCEEDED"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export interface ApiErrorPayload {
  code: StandardErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
}

export interface StandardErrorResponse {
  ok: false;
  success: false;
  error: ApiErrorPayload;
}

export interface StandardSuccessResponse<T = unknown> {
  ok: true;
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = StandardSuccessResponse<T> | StandardErrorResponse;

/**
 * Generates a crypto-secure correlation ID for tracing errors across client & server logs.
 */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a normalized error response contract.
 */
export function createApiError(
  code: StandardErrorCode,
  message: string,
  details?: unknown,
  existingRequestId?: string,
): StandardErrorResponse {
  return {
    ok: false,
    success: false,
    error: {
      code,
      message,
      requestId: existingRequestId || generateRequestId(),
      ...(details !== undefined ? { details } : {}),
    },
  };
}

/**
 * Pattern for keys that must be redacted in logs and error context.
 */
const SENSITIVE_KEY_PATTERN = /(password|token|secret|key|otp|auth|cookie|session|authorization)/i;

/**
 * Deeply sanitizes sensitive properties before logging or error serialization.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 5) return "[MaxDepth]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact Bearer tokens or high-entropy credentials
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]");
    }
    return data;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        clean[k] = "[REDACTED]";
      } else {
        clean[k] = sanitizeLogData(v, depth + 1);
      }
    }
    return clean;
  }

  return String(data);
}
