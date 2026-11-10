import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

import { logApplicationError } from "./lib/error-logger";
import { generateRequestId } from "./lib/errors";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
export async function normalizeCatastrophicSsrResponse(
  response: Response,
  requestId: string,
  request?: Request,
): Promise<Response> {
  if (response.status < 500) return response;
  const isServerFn =
    request?.url?.includes("/_server") ||
    request?.headers?.has("x-ts-server-fn") ||
    request?.headers?.has("x-server-function");
  if (isServerFn) return response;

  const isHtmlRequest =
    request?.method !== "POST" &&
    request?.method !== "PUT" &&
    request?.method !== "PATCH" &&
    request?.method !== "DELETE" &&
    request?.headers.get("accept")?.includes("text/html");
  const captured = consumeLastCapturedError();
  logApplicationError(captured ?? new Error(`SSR request returned HTTP ${response.status}`), {
    boundary: "NitroSsrHandler",
    requestId,
    metadata: { status: response.status },
  });

  if (isHtmlRequest) {
    return new Response(renderErrorPage(requestId), {
      status: response.status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(
    JSON.stringify({
      error: "Internal Server Error",
      message: "An unexpected error occurred. Please try again.",
      requestId,
    }),
    {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

/**
 * Injects defensive HTTP security headers onto every outbound response:
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: SAMEORIGIN
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: camera=(self), microphone=(), geolocation=()
 * - Strict-Transport-Security: max-age=31536000; includeSubDomains
 * - X-Request-Id: correlation tracking
 */
export function applySecurityHeaders(response: Response, requestId: string): Response {
  try {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    if (!response.headers.has("X-Request-Id")) {
      response.headers.set("X-Request-Id", requestId);
    }
    return response;
  } catch {
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    if (!headers.has("X-Request-Id")) {
      headers.set("X-Request-Id", requestId);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestId = generateRequestId();

    try {
      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(request, env, ctx);
      const response = await normalizeCatastrophicSsrResponse(rawResponse, requestId, request);
      return applySecurityHeaders(response, requestId);
    } catch (error) {
      logApplicationError(error, { boundary: "NitroServerEntry", requestId });
      const isServerFn =
        request.url?.includes("/_server") ||
        request.headers.has("x-ts-server-fn") ||
        request.headers.has("x-server-function");
      const isHtmlRequest =
        !isServerFn &&
        request.method !== "POST" &&
        request.method !== "PUT" &&
        request.method !== "PATCH" &&
        request.method !== "DELETE" &&
        request.headers.get("accept")?.includes("text/html");
      if (!isHtmlRequest) {
        const errResponse = new Response(
          JSON.stringify({
            error: "Internal Server Error",
            message: "An unexpected error occurred. Please try again.",
            requestId,
          }),
          {
            status: 500,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
        return applySecurityHeaders(errResponse, requestId);
      }
      const errResponse = new Response(renderErrorPage(requestId), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applySecurityHeaders(errResponse, requestId);
    }
  },
};
