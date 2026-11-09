import { describe, expect, it } from "vitest";
import { hasCompletePartnerEvidence } from "@/lib/partner-publication";

const completeEvidence = {
  representative_name: "Authorised representative",
  business_verified_at: "2026-11-01T00:00:00Z",
  agreement_reference: "secure-file-123",
  agreement_signed_at: "2026-11-01T00:00:00Z",
  benefit_dispute_contact: "support@example.test",
};

describe("partner publication evidence", () => {
  it("requires every evidence field before application fallback publication", () => {
    expect(hasCompletePartnerEvidence(completeEvidence)).toBe(true);
    for (const key of Object.keys(completeEvidence) as (keyof typeof completeEvidence)[]) {
      expect(hasCompletePartnerEvidence({ ...completeEvidence, [key]: "  " })).toBe(false);
    }
    expect(hasCompletePartnerEvidence(null)).toBe(false);
  });

  it("keeps private evidence out of the public partner projection", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/public.functions.ts", "utf8");
    const projection = source.match(/const PARTNER_COLS =([\s\S]*?);/)?.[1] || "";
    expect(projection).not.toMatch(/representative_name|agreement_reference|agreement_signed_at|business_verified_at|benefit_dispute_contact/);
  });

  it("requires complete evidence before the local sitemap fallback adds a partner", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/routes/sitemap[.]xml.ts", "utf8");
    expect(source).toMatch(/partner\.status === "ACTIVE" &&\s*hasCompletePartnerEvidence\(partner\)/);
  });
});
