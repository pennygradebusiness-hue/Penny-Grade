import crypto from "node:crypto";

/**
 * PennyGrade Razorpay Payment Service
 *
 * Implements server-side Razorpay order generation, HMAC SHA256 payment signature
 * verification, and webhook signature verification with constant-time equality check.
 * Includes resilient DNS resolution (Google/Cloudflare fallback) to avoid local ISP
 * router lookup timeouts on Windows and containerized environments.
 */

export interface RazorpayCreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayPaymentResponse {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  captured: boolean;
}

export function razorpayPaymentMatchesOrder(
  payment: RazorpayPaymentResponse,
  expected: { orderId: string; amountInPaise: number; currency: string },
): boolean {
  return (
    payment.order_id === expected.orderId &&
    payment.amount === expected.amountInPaise &&
    payment.currency === expected.currency
  );
}

export function isRazorpayPaymentCaptured(payment: RazorpayPaymentResponse): boolean {
  return payment.status === "captured" && payment.captured;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    /^rzp_(test|live)_/.test(process.env.RAZORPAY_KEY_ID || "") && process.env.RAZORPAY_KEY_SECRET,
  );
}

export function getPublicRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || "";
}

function isNetworkTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const details = error as { name?: unknown; message?: unknown; cause?: { code?: unknown } };
  const message = typeof details.message === "string" ? details.message : "";
  return (
    details.name === "AbortError" ||
    details.name === "TimeoutError" ||
    /operation was aborted|request timed out/i.test(message) ||
    details.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
  );
}

export function getRazorpayOrderErrorMessage(error: unknown): string {
  if (isNetworkTimeout(error)) {
    return "Razorpay did not respond in time. Check that this server can reach api.razorpay.com over HTTPS (port 443), then retry.";
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "Could not connect to Razorpay. Check server internet access and Razorpay API availability, then retry.";
  }
  return `Unable to create Razorpay order: ${error instanceof Error ? error.message : "unknown error"}`;
}

interface HttpRequestOptions {
  method: "GET" | "POST";
  path: string;
  auth: string;
  body?: string;
  timeoutMs?: number;
}

interface HttpResponse {
  ok: boolean;
  status: number;
  text: string;
  json: <T = unknown>() => T;
}

async function executeResilientHttpsRequest(options: HttpRequestOptions): Promise<HttpResponse> {
  if (typeof window !== "undefined") {
    throw new Error("Razorpay direct API cannot be executed client-side.");
  }

  const dns = await import("node:dns");
  const https = await import("node:https");

  const fallbackResolver = new dns.promises.Resolver();
  try {
    fallbackResolver.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
    // safe fallback
  }

  function reliableLookup(
    hostname: string,
    opts: any,
    callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void,
  ) {
    const cb = typeof opts === "function" ? opts : callback;
    const lookupOpts = typeof opts === "object" ? opts : {};

    fallbackResolver
      .resolve4(hostname)
      .then((ips) => {
        if (!ips || ips.length === 0) throw new Error("No IPv4 address resolved");
        if (lookupOpts.all) {
          cb(null, ips.map((ip) => ({ address: ip, family: 4 })));
        } else {
          cb(null, ips[0], 4);
        }
      })
      .catch(() => {
        dns.lookup(hostname, lookupOpts, cb);
      });
  }

  return new Promise((resolve, reject) => {
    const postData = options.body;
    const req = https.request(
      {
        hostname: "api.razorpay.com",
        port: 443,
        path: options.path,
        method: options.method,
        lookup: reliableLookup,
        timeout: options.timeoutMs || 15000,
        headers: {
          Authorization: `Basic ${options.auth}`,
          ...(postData
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            text: raw,
            json: () => JSON.parse(raw),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out connecting to api.razorpay.com"));
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function executeRazorpayRequest(options: HttpRequestOptions): Promise<HttpResponse> {
  // In unit test environment, delegate to global fetch if mocked so test mocks (vi.stubGlobal) function as expected
  if (
    process.env.NODE_ENV === "test" ||
    typeof (globalThis.fetch as any)?.mock !== "undefined"
  ) {
    return fetch(`https://api.razorpay.com${options.path}`, {
      method: options.method,
      headers: {
        Authorization: `Basic ${options.auth}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: options.body } : {}),
    }).then(async (res) => {
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        text,
        json: () => JSON.parse(text),
      };
    });
  }

  return executeResilientHttpsRequest(options);
}

/** Read payment state from Razorpay before fulfilling an order. */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentResponse> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    throw new Error(
      "Razorpay payment verification is not configured or the payment ID is invalid.",
    );
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await executeRazorpayRequest({
    method: "GET",
    path: `/v1/payments/${encodeURIComponent(paymentId)}`,
    auth,
    timeoutMs: 15000,
  });

  if (!response.ok) throw new Error(`Razorpay payment lookup failed (${response.status}).`);
  const payment = response.json<RazorpayPaymentResponse>();
  if (
    payment.id !== paymentId ||
    !Number.isSafeInteger(payment.amount) ||
    !payment.currency ||
    !payment.status
  ) {
    throw new Error("Razorpay returned an invalid payment response.");
  }
  return payment;
}

function getRazorpayKeySecret(): string | null {
  return (
    process.env.RAZORPAY_KEY_SECRET ||
    (process.env.NODE_ENV === "test" ? "unit_test_razorpay_secret" : null)
  );
}

function getRazorpayWebhookSecret(): string | null {
  return (
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    (process.env.NODE_ENV === "test" ? "unit_test_webhook_secret" : null)
  );
}

/**
 * Creates an order on Razorpay servers via official REST API.
 * Unit tests without credentials receive a clearly synthetic order. Deployed
 * environments always require valid credentials and a real API response.
 */
export async function createRazorpayOrder(
  params: RazorpayCreateOrderParams,
): Promise<RazorpayOrderResponse> {
  if (!Number.isSafeInteger(Math.round(params.amountInPaise)) || params.amountInPaise <= 0) {
    throw new Error("Razorpay order amount must be a positive safe integer in paise.");
  }
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (process.env.NODE_ENV === "test" && (!keyId || !keySecret)) {
    return {
      id: `order_test_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      amount: Math.round(params.amountInPaise),
      currency: params.currency || "INR",
      receipt: params.receipt,
      status: "created",
    };
  }

  if (!keyId || !keySecret || !/^rzp_(test|live)_/.test(keyId)) {
    throw new Error(
      "Razorpay is not configured. Set a valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await executeRazorpayRequest({
      method: "POST",
      path: "/v1/orders",
      auth,
      body: JSON.stringify({
        amount: Math.round(params.amountInPaise),
        currency: params.currency || "INR",
        receipt: params.receipt,
        notes: params.notes || {},
      }),
      timeoutMs: 15000,
    });

    if (!response.ok) {
      throw new Error(`Razorpay order creation failed (${response.status}): ${response.text}`);
    }

    const data = response.json<{
      id: string;
      amount: number;
      currency: string;
      receipt: string;
      status: string;
    }>();
    if (
      !/^order_[A-Za-z0-9]+$/.test(data.id || "") ||
      data.amount !== Math.round(params.amountInPaise) ||
      data.currency !== (params.currency || "INR") ||
      data.receipt !== params.receipt ||
      data.status !== "created"
    ) {
      throw new Error("Razorpay returned an invalid order response.");
    }
    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status,
    };
  } catch (err) {
    console.error("[RazorpayService] Order API request failed:", err);
    throw new Error(getRazorpayOrderErrorMessage(err), { cause: err });
  }
}

/**
 * Verifies Razorpay client payment signature using HMAC SHA256 and constant-time comparison.
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  customSecret?: string;
}): boolean {
  const secret = params.customSecret || getRazorpayKeySecret();
  if (!secret) return false;
  if (
    !params.razorpayOrderId ||
    !/^pay_[A-Za-z0-9]+$/.test(params.razorpayPaymentId) ||
    !/^[a-f0-9]{64}$/i.test(params.razorpaySignature)
  ) {
    return false;
  }

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const actualBuf = Buffer.from(params.razorpaySignature, "utf-8");
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature using HMAC SHA256 and constant-time comparison.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
  customSecret?: string;
}): boolean {
  const secret = params.customSecret || getRazorpayWebhookSecret();
  if (!secret) return false;
  if (!params.rawBody || !/^[a-f0-9]{64}$/i.test(params.signature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const actualBuf = Buffer.from(params.signature, "utf-8");
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Helper to compute signature for testing
 */
export function generateTestPaymentSignature(
  orderId: string,
  paymentId: string,
  secret?: string,
): string {
  const key = secret || getRazorpayKeySecret();
  if (!key) throw new Error("Razorpay secret is not configured.");
  return crypto.createHmac("sha256", key).update(`${orderId}|${paymentId}`).digest("hex");
}
