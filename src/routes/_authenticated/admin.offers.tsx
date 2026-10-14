import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { DAYS, formatDays, inr, offerHeadline } from "@/lib/format";
import { getAdminOffers, saveOffer, deleteOffer, getAdminPartners } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  validateSearch: z.object({
    partner: z.string().optional(),
    create: z.union([z.string(), z.boolean()]).optional(),
  }),
  component: Offers,
});

const EMPTY = {
  partner_id: "",
  title: "",
  description: "",
  discount_type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discount_value: 10,
  max_discount: "" as number | "",
  minimum_bill: 0,
  valid_from: "",
  valid_until: "",
  valid_days: [0, 1, 2, 3, 4, 5, 6],
  terms_conditions: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
};
type Form = typeof EMPTY & { id?: string };

function Offers() {
  const { partner, create } = Route.useSearch();
  const qc = useQueryClient();
  const [pf, setPf] = useState(partner ?? "");

  const getAdminOffersFn = useServerFn(getAdminOffers);
  const getAdminPartnersFn = useServerFn(getAdminPartners);
  const saveOfferFn = useServerFn(saveOffer);
  const deleteOfferFn = useServerFn(deleteOffer);

  const partners = useQuery({
    queryKey: ["admin", "partners-min"],
    queryFn: async () => {
      try {
        const res = await getAdminPartnersFn();
        if (res && res.length) return res.map((p) => ({ id: p.id, business_name: p.business_name }));
      } catch {
        // fallback
      }
      return (await supabase.from("partners").select("id,business_name").order("business_name")).data ?? [];
    },
  });

  const q = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: async () => {
      try {
        const res = await getAdminOffersFn();
        if (res) return res;
      } catch {
        // ignore
      }
      return [];
    },
  });

  const [edit, setEdit] = useState<Form | null>(null);
  const list = (q.data ?? []).filter((o) => !pf || o.partner_id === pf);
  const selectedPartner = partners.data?.find((p) => p.id === pf);

  useEffect(() => {
    if (create && partner) {
      const p = partners.data?.find((x) => x.id === partner);
      setEdit({
        ...EMPTY,
        partner_id: partner,
        title: p ? `10% Off at ${p.business_name}` : "10% Off on Total Bill",
        discount_value: 10,
      });
    }
  }, [create, partner, partners.data]);

  const save = async () => {
    if (!edit?.partner_id || !edit.title || !(edit.discount_value > 0)) {
      return toast.error("Partner, title and discount are required");
    }
    if (edit.discount_type === "PERCENTAGE" && edit.discount_value > 100) {
      return toast.error("Percentage cannot exceed 100");
    }
    if (!edit.valid_days.length) {
      return toast.error("Select at least one valid day");
    }

    const { id, ...f } = edit;
    const payload = {
      ...f,
      id: id || undefined,
      max_discount: f.max_discount === "" ? null : Number(f.max_discount),
      valid_from: f.valid_from || null,
      valid_until: f.valid_until || null,
    };

    try {
      await saveOfferFn({ data: payload });
      try {
        if (id) {
          await supabase.from("offers").update(payload).eq("id", id);
        } else {
          await supabase.from("offers").insert(payload);
        }
      } catch {
        // ignore client supabase write error if RLS handled server-side
      }
      await logAudit(id ? "Changed offer" : "Created offer", "offer", id ?? null, {
        title: payload.title,
        discount: `${payload.discount_type} ${payload.discount_value}`,
        max: payload.max_discount,
        min: payload.minimum_bill,
      });
      toast.success(id ? "Offer updated permanently" : "Offer created permanently");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    } catch (err: any) {
      toast.error(err?.message || "Could not save offer");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the offer "${title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteOfferFn({ data: { id } });
      try {
        await supabase.from("verification_logs").delete().eq("offer_id", id);
        await supabase.from("offers").delete().eq("id", id);
      } catch {
        // ignore
      }
      toast.success(`Offer "${title}" permanently deleted`);
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete offer");
    }
  };

  const toggleDay = (d: number) =>
    setEdit({
      ...edit!,
      valid_days: edit!.valid_days.includes(d)
        ? edit!.valid_days.filter((x) => x !== d)
        : [...edit!.valid_days, d].sort(),
    });

  return (
    <>
      <PageHeader
        title="Offers"
        desc="Partner QR codes always show the current active offer."
        actions={
          <Button size="sm" onClick={() => setEdit({ ...EMPTY, partner_id: pf })}>
            Create offer
          </Button>
        }
      />
      <Select className="mb-4" value={pf} onChange={setPf}>
        <option value="">All partners</option>
        {partners.data?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.business_name}
          </option>
        ))}
      </Select>
      {q.isLoading ? (
        <TableSkeleton />
      ) : list.length === 0 ? (
        <div className="my-6 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-xl font-black">
            %
          </div>
          <h3 className="font-display text-base font-bold text-slate-800">
            {selectedPartner ? `No offers created yet for ${selectedPartner.business_name}` : "No offers found"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            {selectedPartner
              ? "This partner currently displays as 'New Partner' on the public site. Create their first offer so members can claim discounts."
              : "Create a discount offer to start rewarding PennyGrade members."}
          </p>
          <Button
            className="mt-4 bg-amber-500 font-bold text-slate-900 hover:bg-amber-600 shadow-sm"
            onClick={() =>
              setEdit({
                ...EMPTY,
                partner_id: pf,
                title: selectedPartner ? `10% Off at ${selectedPartner.business_name}` : "10% Off on Total Bill",
                discount_value: 10,
              })
            }
          >
            + Create First Offer {selectedPartner ? `for ${selectedPartner.business_name}` : ""}
          </Button>
        </div>
      ) : (
        <DataTable
          head={["Partner", "Offer", "Discount", "Max", "Min bill", "Days", "Validity", "Status", ""]}
          empty={false}
        >
          {list.map((o) => (
            <tr key={o.id}>
              <td className={`${td} font-medium`}>{o.partner?.business_name || "—"}</td>
              <td className={td}>{o.title}</td>
              <td className={td}>{offerHeadline({ ...o, max_discount: o.max_discount ?? null })}</td>
              <td className={td}>{o.max_discount ? inr(o.max_discount) : "—"}</td>
              <td className={td}>{inr(o.minimum_bill)}</td>
              <td className={td}>{formatDays(o.valid_days)}</td>
              <td className={td}>
                {o.valid_from || "∞"} → {o.valid_until || "∞"}
              </td>
              <td className={td}>
                <StatusBadge status={o.status} />
              </td>
              <td className={td}>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEdit({
                        ...EMPTY,
                        ...o,
                        description: o.description ?? "",
                        terms_conditions: o.terms_conditions ?? "",
                        max_discount: o.max_discount ?? "",
                        valid_from: o.valid_from ?? "",
                        valid_until: o.valid_until ?? "",
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(o.id, o.title)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit offer" : "New offer"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <F l="Partner">
                  <Select
                    className="w-full"
                    value={edit.partner_id}
                    onChange={(v) => setEdit({ ...edit, partner_id: v })}
                  >
                    <option value="">Select partner</option>
                    {partners.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.business_name}
                      </option>
                    ))}
                  </Select>
                </F>
              </div>
              <F l="Offer title">
                <Input
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                  placeholder="10% Off"
                />
              </F>
              <F l="Discount type">
                <Select
                  className="w-full"
                  value={edit.discount_type}
                  onChange={(v) => setEdit({ ...edit, discount_type: v as "FIXED" })}
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </Select>
              </F>
              <F l={edit.discount_type === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}>
                <Input
                  type="number"
                  value={edit.discount_value}
                  onChange={(e) => setEdit({ ...edit, discount_value: Number(e.target.value) })}
                />
              </F>
              <F l="Maximum discount (₹)">
                <Input
                  type="number"
                  value={edit.max_discount}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      max_discount: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  placeholder="No cap"
                />
              </F>
              <F l="Minimum bill (₹)">
                <Input
                  type="number"
                  value={edit.minimum_bill}
                  onChange={(e) => setEdit({ ...edit, minimum_bill: Number(e.target.value) })}
                />
              </F>
              <F l="Usage">
                <Input value="Unlimited" disabled />
              </F>
              <F l="Valid from">
                <Input
                  type="date"
                  value={edit.valid_from}
                  onChange={(e) => setEdit({ ...edit, valid_from: e.target.value })}
                />
              </F>
              <F l="Valid until">
                <Input
                  type="date"
                  value={edit.valid_until}
                  onChange={(e) => setEdit({ ...edit, valid_until: e.target.value })}
                />
              </F>
              <div className="sm:col-span-2">
                <F l="Valid days">
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                          edit.valid_days.includes(i)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-card"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </F>
              </div>
              <div className="sm:col-span-2">
                <F l="Description">
                  <Input
                    value={edit.description}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  />
                </F>
              </div>
              <div className="sm:col-span-2">
                <F l="Terms & conditions">
                  <Textarea
                    value={edit.terms_conditions}
                    onChange={(e) => setEdit({ ...edit, terms_conditions: e.target.value })}
                    placeholder="Valid on dine-in bills only. Cannot be combined with other offers."
                  />
                </F>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.status === "ACTIVE"}
                  onChange={(e) =>
                    setEdit({ ...edit, status: e.target.checked ? "ACTIVE" : "INACTIVE" })
                  }
                />
                Active
              </label>
              <Button className="sm:col-span-2" onClick={save}>
                Save offer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function F({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{l}</Label>
      {children}
    </div>
  );
}
