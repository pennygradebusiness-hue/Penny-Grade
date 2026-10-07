import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Settings });

function Settings() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Verification">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Live verification validity: <strong className="text-foreground">5 minutes</strong></li>
            <li>Offer usage: <strong className="text-foreground">Unlimited</strong> (verifications never consume offers)</li>
            <li>Rate limit: <strong className="text-foreground">6 verifications / member / minute</strong></li>
            <li>Day checks use India Standard Time.</li>
          </ul>
        </Panel>
        <Panel title="V1 scope">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Membership payment is handled offline; activate members from Members.</li>
            <li>No partner logins, staff scanning, POS or messaging integrations.</li>
            <li>Membership & card IDs use secure random PEN-XXXX-XXXX format.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
