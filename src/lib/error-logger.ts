/**
 * Application Error Logging & Telemetry Service
 * Provides centralized error capture, structured diagnostic logging,
 * and integration hooks for production observability platforms (e.g., Sentry, Datadog).
 */

export interface ErrorContext {
  boundary?: string;
  route?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredErrorPayload {
  timestamp: string;
  message: string;
  stack?: string;
  route?: string;
  boundary?: string;
  context?: Record<string, unknown>;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error instanceof Response) return `HTTP ${error.status}: ${error.statusText || "Request failed"}`;
  if (typeof error === "object" && error !== null) {
    const maybeMsg = (error as { message?: unknown }).message;
    if (typeof maybeMsg === "string") return maybeMsg;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return "Unknown application error";
}

/**
 * Captures and logs application runtime errors with structured diagnostic metadata.
 */
export function logApplicationError(error: unknown, context: ErrorContext = {}): void {
  const currentRoute = typeof window !== "undefined" ? window.location.pathname : undefined;
  const payload: StructuredErrorPayload = {
    timestamp: new Date().toISOString(),
    message: extractErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    route: context.route || currentRoute,
    boundary: context.boundary || "ApplicationRoot",
    context: context.metadata,
  };

  // Structured console output for development and server diagnostics
  if (process.env.NODE_ENV !== "production") {
    console.error(`[AppError] [${payload.boundary}]`, payload.message, {
      route: payload.route,
      stack: payload.stack,
      context: payload.context,
    });
  } else {
    // In production, log clean structured JSON for log aggregators
    console.error(JSON.stringify({ level: "error", ...payload }));
  }
}
