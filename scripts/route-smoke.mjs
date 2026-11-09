const baseUrl = (process.env.ROUTE_SMOKE_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const routes = [
  "/",
  "/checkout",
  "/track-order",
  "/refund-policy",
  "/shipping-policy",
  "/verify",
  "/admin/orders",
  "/how-it-works",
];

let failures = 0;

for (const route of routes) {
  try {
    const response = await fetch(new URL(route, baseUrl), {
      headers: { accept: "text/html" },
      redirect: "manual",
    });
    const statusAllowed =
      route === "/admin/orders"
        ? [200, 301, 302, 303, 307, 308, 401, 403].includes(response.status)
        : response.status === 200;
    const requestId = response.headers.get("x-request-id");
    const permissions = response.headers.get("permissions-policy") || "";
    const headersPresent =
      response.headers.get("x-content-type-options") === "nosniff" &&
      response.headers.get("x-frame-options") === "SAMEORIGIN" &&
      response.headers.get("referrer-policy") === "strict-origin-when-cross-origin" &&
      permissions.includes("camera=(self)") &&
      permissions.includes("microphone=()") &&
      permissions.includes("geolocation=()") &&
      (response.headers.get("strict-transport-security") || "").includes("max-age=31536000") &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId || "");

    if (!statusAllowed || !headersPresent) {
      failures += 1;
      console.error(
        `[FAIL] ${route}: HTTP ${response.status}; requestId=${requestId || "missing"}; securityHeaders=${headersPresent}`,
      );
      continue;
    }

    console.log(`[PASS] ${route}: HTTP ${response.status}; requestId=${requestId}; securityHeaders=ok`);
  } catch (error) {
    failures += 1;
    console.error(`[FAIL] ${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const unknownResponse = await fetch(new URL("/__route-smoke-unknown__", baseUrl), {
  headers: { accept: "text/html" },
  redirect: "manual",
}).catch(() => null);
if (!unknownResponse || unknownResponse.status !== 404) {
  failures += 1;
  console.error(`[FAIL] unknown route: expected HTTP 404, received ${unknownResponse?.status ?? "no response"}`);
} else {
  const requestId = unknownResponse.headers.get("x-request-id");
  if (!requestId || unknownResponse.headers.get("x-content-type-options") !== "nosniff") {
    failures += 1;
    console.error("[FAIL] unknown route: missing request ID or security headers");
  } else {
    console.log(`[PASS] unknown route: HTTP 404; requestId=${requestId}`);
  }
}

if (failures > 0) process.exitCode = 1;
