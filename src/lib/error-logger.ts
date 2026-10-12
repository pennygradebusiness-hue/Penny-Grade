/**
 * Application Error Logging & Telemetry Service
 * Provides centralized error capture, structured diagnostic logging,
 * request correlation, and safe payload sanitization.
 */

import { generateRequestId, sanitizeLogData } from "./errors";

export interface ErrorContext {
  boundary?: string;
  route?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredErrorPayload {
  timestamp: string;
  requestId: string;
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
      return JSON.stringify(sanitizeLogData(error));
    } catch {
      return String(error);
    }
  }
  return "Unknown application error";
}

/**
 * Captures and logs application runtime errors with structured diagnostic metadata.
 * Automatically scrubs sensitive credentials and attaches correlation IDs.
 */
export function logApplicationError(error: unknown, context: ErrorContext = {}): string {
  const currentRoute = typeof window !== "undefined" ? window.location.pathname : undefined;
  const requestId = context.requestId || generateRequestId();

  const sanitizedMetadata = context.metadata
    ? (sanitizeLogData(context.metadata) as Record<string, unknown>)
    : undefined;

  const rawMessage = extractErrorMessage(error);
  const sanitizedMessage = typeof sanitizeLogData(rawMessage) === "string"
    ? (sanitizeLogData(rawMessage) as string)
    : rawMessage;

  const payload: StructuredErrorPayload = {
    timestamp: new Date().toISOString(),
    requestId,
    message: sanitizedMessage,
    stack: error instanceof Error ? error.stack : undefined,
    route: context.route || currentRoute,
    boundary: context.boundary || "ApplicationRoot",
    context: sanitizedMetadata,
  };

  // Structured console output for development and server diagnostics
  if (process.env.NODE_ENV !== "production") {
    console.error(`[AppError] [${payload.boundary}] [${requestId}]`, payload.message, {
      route: payload.route,
      stack: payload.stack,
      context: payload.context,
    });
  } else {
    // In production, log clean structured JSON for log aggregators without leaking secrets
    console.error(JSON.stringify({ level: "error", ...payload }));
  }

  return requestId;
}
