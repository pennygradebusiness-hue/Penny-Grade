import { describe, expect, it } from "vitest";
import { applySecurityHeaders, normalizeCatastrophicSsrResponse } from "@/server";

const requestId = "2f6ebbf4-0a1a-4b20-bc29-1a9fba0d4c91";

describe("server error boundary", () => {
  it("returns safe JSON with a request ID for non-HTML 5xx responses", async () => {
    const response = await normalizeCatastrophicSsrResponse(
      new Response("database password=do-not-expose", {
        status: 500,
        headers: { "content-type": "text/plain" },
      }),
      requestId,
      new Request("https://pennygrade.test/api/example", {
        headers: { accept: "application/json" },
      }),
    );
    const secured = applySecurityHeaders(response, requestId);
    const body = await secured.text();

    expect(secured.status).toBe(500);
    expect(secured.headers.get("content-type")).toContain("application/json");
    expect(secured.headers.get("x-request-id")).toBe(requestId);
    expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
    expect(secured.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(secured.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(JSON.parse(body)).toEqual({
      error: "Internal Server Error",
      message: "An unexpected error occurred. Please try again.",
      requestId,
    });
    expect(body).not.toContain("do-not-expose");
  });

  it("returns the branded fallback page for HTML 5xx responses without exposing the original body", async () => {
    const response = await normalizeCatastrophicSsrResponse(
      new Response("private stack trace", { status: 500 }),
      requestId,
      new Request("https://pennygrade.test/how-it-works", {
        headers: { accept: "text/html" },
      }),
    );
    const secured = applySecurityHeaders(response, requestId);
    const body = await secured.text();

    expect(secured.status).toBe(500);
    expect(secured.headers.get("content-type")).toContain("text/html");
    expect(secured.headers.get("x-request-id")).toBe(requestId);
    expect(body).toContain(`Reference ID: ${requestId}`);
    expect(body).not.toContain("private stack trace");
  });

  it("leaves non-server-error responses unchanged", async () => {
    const original = new Response("not found", { status: 404 });

    await expect(
      normalizeCatastrophicSsrResponse(
        original,
        requestId,
        new Request("https://pennygrade.test/missing", { headers: { accept: "*/*" } }),
      ),
    ).resolves.toBe(original);
  });
});
