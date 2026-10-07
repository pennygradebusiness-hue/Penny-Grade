import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton } from "@/components/admin-ui";
import { StatusBadge, LOGO_URL } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/admin/qr-codes")({ component: QrCodes });

type P = { id: string; business_name: string; slug: string; status: string; qr_created_at: string | null };
const qrUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}`;

function QrCodes() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "qr"], queryFn: async () => ((await supabase.from("partners").select("id,business_name,slug,status,qr_created_at").order("business_name")).data ?? []) as P[] });
  const [preview, setPreview] = useState<P | null>(null);
  const regenerate = async (p: P) => {
    const { error } = await supabase.from("partners").update({ qr_created_at: new Date().toISOString() }).eq("id", p.id);
    if (error) return toast.error("Not permitted");
    await logAudit("Regenerated QR", "partner", p.id, { slug: p.slug });
    toast.success("QR regenerated — URL is unchanged"); qc.invalidateQueries({ queryKey: ["admin", "qr"] });
  };
  return (
    <>
      <PageHeader title="QR Codes" desc="Each partner has one permanent QR pointing to /p/[slug]. Offers can change without reprinting." />
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Partner", "QR status", "QR URL", "Created", "Actions"]} empty={!q.data?.length}>
          {q.data?.map((p) => (
            <tr key={p.id}>
              <td className={`${td} font-medium`}>{p.business_name}</td>
              <td className={td}><StatusBadge status={p.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"} /></td>
              <td className={`${td} font-mono text-xs`}>/p/{p.slug}</td>
              <td className={td}>{p.qr_created_at?.slice(0, 10) ?? "—"}</td>
              <td className={`${td} space-x-1`}>
                <Button size="sm" variant="ghost" onClick={() => setPreview(p)}>Preview / Print</Button>
                <Button size="sm" variant="ghost" onClick={() => download(p)}>Download</Button>
                <Button size="sm" variant="ghost" onClick={() => regenerate(p)}>Regenerate</Button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent><DialogHeader><DialogTitle>{preview?.business_name}</DialogTitle></DialogHeader>
          {preview && <QrPoster p={preview} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

async function download(p: P) {
  const url = await QRCode.toDataURL(qrUrl(p.slug), { width: 1024, margin: 2, color: { dark: "#1b2333", light: "#ffffff" } });
  const a = document.createElement("a"); a.href = url; a.download = `pennygrade-qr-${p.slug}.png`; a.click();
  toast.success("QR downloaded");
}

function QrPoster({ p }: { p: P }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(qrUrl(p.slug), { width: 600, margin: 1, color: { dark: "#1b2333", light: "#ffffff" } }).then(setSrc); }, [p.slug]);
  const print = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${p.business_name} QR</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">
      <img src="${location.origin}${LOGO_URL}" style="width:220px;border-radius:12px"/><h1 style="margin:24px 0 4px">PennyGrade Member Benefits</h1>
      <p style="font-size:20px;margin:0 0 24px">${p.business_name}</p><img src="${src}" style="width:380px"/>
      <p style="font-size:18px">Members: scan, enter your bill, show the screen to staff.</p><p style="color:#666">${qrUrl(p.slug)}</p>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };
  return (
    <div className="text-center">
      <div className="mx-auto w-fit rounded-2xl bg-navy p-5">
        {src ? <img src={src} alt={`QR for ${p.business_name}`} className="h-60 w-60 rounded-lg" /> : <div className="h-60 w-60 animate-pulse rounded-lg bg-muted" />}
        <p className="mt-3 font-display font-semibold text-navy-foreground">Scan for PennyGrade discount</p>
      </div>
      <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{qrUrl(p.slug)}</p>
      <div className="mt-4 flex justify-center gap-2"><Button onClick={() => download(p)} variant="outline">Download PNG</Button><Button onClick={print}>Print</Button></div>
    </div>
  );
}
