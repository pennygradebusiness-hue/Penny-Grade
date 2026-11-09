import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayOrderErrorMessage,
  generateTestPaymentSignature,
  isRazorpayPaymentCaptured,
  razorpayPaymentMatchesOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay.service";

const savedEnv = {
  nodeEnv: process.env.NODE_ENV,
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries({
    NODE_ENV: savedEnv.nodeEnv,
    RAZORPAY_KEY_ID: savedEnv.keyId,
    RAZORPAY_KEY_SECRET: savedEnv.keySecret,
    RAZORPAY_WEBHOOK_SECRET: savedEnv.webhookSecret,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Razorpay service", () => {
  it("creates an order through Razorpay using server credentials", async () => {
    process.env.NODE_ENV = "production";
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "unit_secret";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "order_real123",
          amount: 50000,
          currency: "INR",
          receipt: "ORD-123",
          status: "created",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const order = await createRazorpayOrder({ amountInPaise: 50000, receipt: "ORD-123" });

    expect(order.id).toBe("order_real123");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(request.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("rzp_test_unit:unit_secret").toString("base64")}`,
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      amount: 50000,
      currency: "INR",
      receipt: "ORD-123",
    });
  });

  it("fails closed when production credentials are missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    await expect(createRazorpayOrder({ amountInPaise: 50000, receipt: "ORD-123" })).rejects.toThrow(
      /not configured/i,
    );
  });

  it("turns aborted provider requests into an actionable connectivity error", () => {
    expect(
      getRazorpayOrderErrorMessage(new DOMException("This operation was aborted", "AbortError")),
    ).toMatch(/api\.razorpay\.com.*port 443/i);
    expect(getRazorpayOrderErrorMessage(new Error("Invalid API key"))).toMatch(/Invalid API key/);
  });

  it("rejects provider errors instead of returning a synthetic live order", async () => {
    process.env.NODE_ENV = "production";
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "unit_secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid credentials", { status: 401 })),
    );
    await expect(createRazorpayOrder({ amountInPaise: 50000, receipt: "ORD-123" })).rejects.toThrow(
      /401/,
    );
  });

  it("reads authoritative payment status from Razorpay with configured credentials", async () => {
    process.env.NODE_ENV = "production";
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "unit_secret";
    const payment = {
      id: "pay_123abc",
      order_id: "order_123abc",
      amount: 50000,
      currency: "INR",
      status: "captured",
      captured: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(payment), { status: 200 })),
    );

    await expect(fetchRazorpayPayment(payment.id)).resolves.toMatchObject(payment);
  });

  it("matches order ID, amount and currency exactly", () => {
    const payment = {
      id: "pay_123abc",
      order_id: "order_123abc",
      amount: 50000,
      currency: "INR",
      status: "captured" as const,
      captured: true,
    };
    const expected = { orderId: "order_123abc", amountInPaise: 50000, currency: "INR" };
    expect(razorpayPaymentMatchesOrder(payment, expected)).toBe(true);
    expect(razorpayPaymentMatchesOrder(payment, { ...expected, orderId: "order_other" })).toBe(
      false,
    );
    expect(razorpayPaymentMatchesOrder(payment, { ...expected, amountInPaise: 100 })).toBe(false);
    expect(razorpayPaymentMatchesOrder(payment, { ...expected, currency: "USD" })).toBe(false);
  });

  it("only treats captured payments as eligible; authorized, failed and late callbacks are not paid", () => {
    const payment = {
      id: "pay_123abc",
      order_id: "order_123abc",
      amount: 50000,
      currency: "INR",
      status: "captured" as const,
      captured: true,
    };
    expect(isRazorpayPaymentCaptured(payment)).toBe(true);
    expect(isRazorpayPaymentCaptured({ ...payment, status: "authorized", captured: false })).toBe(
      false,
    );
    expect(isRazorpayPaymentCaptured({ ...payment, status: "failed", captured: false })).toBe(
      false,
    );
    expect(isRazorpayPaymentCaptured({ ...payment, status: "captured", captured: false })).toBe(
      false,
    );
  });

  it("verifies payment signatures and rejects forged values", () => {
    const signature = generateTestPaymentSignature("order_123", "pay_123");
    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: signature,
      }),
    ).toBe(true);
    expect(
      verifyRazorpayPaymentSignature({
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "forged",
      }),
    ).toBe(false);
  });

  it("verifies webhook signatures against the raw body", () => {
    const rawBody = '{"event":"payment.captured"}';
    const signature = crypto.createHmac("sha256", "hook_secret").update(rawBody).digest("hex");
    expect(
      verifyRazorpayWebhookSignature({ rawBody, signature, customSecret: "hook_secret" }),
    ).toBe(true);
    expect(
      verifyRazorpayWebhookSignature({
        rawBody: `${rawBody} `,
        signature,
        customSecret: "hook_secret",
      }),
    ).toBe(false);
  });
});
