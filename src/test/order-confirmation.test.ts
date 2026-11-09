import { describe, expect, it } from "vitest";
import {
  consumeVerifiedOrderForNavigation,
  recordVerifiedOrderForNavigation,
} from "@/lib/order-confirmation";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("order confirmation navigation handoff", () => {
  it("does not confirm an order when its URL is opened directly", () => {
    expect(consumeVerifiedOrderForNavigation("QA-ORD-0001", memoryStorage())).toBeNull();
  });

  it("does not consume the handoff when a different order number is requested", () => {
    const storage = memoryStorage();
    recordVerifiedOrderForNavigation({
      orderNumber: "QA-ORD-0001", paymentStatus: "CAPTURED", cardStatus: "ALLOCATED", emailStatus: "SENT",
    }, storage);

    expect(consumeVerifiedOrderForNavigation("QA-ORD-OTHER", storage)).toBeNull();
    expect(consumeVerifiedOrderForNavigation("QA-ORD-0001", storage)?.cardStatus).toBe("ALLOCATED");
  });

  it("allows a matching, verified checkout result exactly once", () => {
    const storage = memoryStorage();
    recordVerifiedOrderForNavigation({
      orderNumber: "QA-ORD-0002", paymentStatus: "CAPTURED", cardStatus: "FULFILLMENT_EXCEPTION", emailStatus: "FAILED",
    }, storage);

    const handoff = consumeVerifiedOrderForNavigation("QA-ORD-0002", storage);
    expect(handoff).toMatchObject({ cardStatus: "FULFILLMENT_EXCEPTION", emailStatus: "FAILED" });
    expect(consumeVerifiedOrderForNavigation("QA-ORD-0002", storage)).toBeNull();
  });
});
