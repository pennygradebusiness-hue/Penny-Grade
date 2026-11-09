import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email.service";

const original = {
  nodeEnv: process.env.NODE_ENV,
  resendKey: process.env.RESEND_API_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
};

afterEach(() => {
  vi.unstubAllGlobals();
  if (original.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = original.nodeEnv;
  if (original.resendKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = original.resendKey;
  if (original.serviceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = original.serviceKey;
  if (original.supabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = original.supabaseUrl;
});

describe("transactional email delivery", () => {
  it("sends with provider idempotency so webhook retries do not duplicate messages", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = "re_unit_test_key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTransactionalEmail({
      recipientEmail: "member@example.com",
      eventType: "PURCHASE_CONFIRMATION",
      subject: "Order confirmed",
      html: "<p>Confirmed</p>",
      idempotencyKey: "order-confirm-order-123",
    });

    expect(result).toMatchObject({ ok: true, status: "SENT", messageId: "email_123" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({ "Idempotency-Key": "order-confirm-order-123" });
  });

  it("reports provider rejection as failed so the webhook can retry", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = "re_unit_test_key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid sender", { status: 422 })),
    );

    const result = await sendTransactionalEmail({
      recipientEmail: "member@example.com",
      eventType: "PURCHASE_CONFIRMATION",
      subject: "Order confirmed",
      html: "<p>Confirmed</p>",
      idempotencyKey: "order-confirm-order-456",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
  });

  it("does not mark a production email as sent when the Resend API key is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTransactionalEmail({
      recipientEmail: "member@example.com",
      eventType: "PURCHASE_CONFIRMATION",
      subject: "Order confirmed",
      html: "<p>Confirmed</p>",
      idempotencyKey: "order-confirm-order-789",
    });
    expect(result).toMatchObject({ ok: false, status: "FAILED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
