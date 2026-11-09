import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each([
    ["/checkout", "/checkout"],
    ["/track-order", "/track-order"],
    ["/refund-policy", "/refund-policy"],
    ["/shipping-policy", "/shipping-policy"],
    ["/verify", "/verify"],
    ["/admin/orders", "/_authenticated/admin/orders"],
    ["/how-it-works", "/how-it-works"],
    ["/order-confirmation/ORD-ABCD-EFGH", "/order-confirmation/$orderNumber"],
    ["/p/sample-partner", "/p/$partnerSlug"],
    ["/verification/00000000-0000-4000-8000-000000000000", "/verification/$sessionId"],
  ])("matches %s directly to its route", (path, expectedRouteId) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path);

    expect(matches.some((match) => match.routeId === expectedRouteId)).toBe(true);
  });
});
