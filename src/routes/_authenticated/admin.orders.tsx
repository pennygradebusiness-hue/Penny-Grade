import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  CreditCard,
  User,
  MapPin,
  ChevronRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import {
  PageHeader,
  DataTable,
  td,
  TableSkeleton,
  Select,
  downloadCsv,
} from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getAdminOrders,
  updateAdminOrderStatus,
  assignAdminOrderCard,
  getAdminEmailLogs,
  retryAdminEmail,
  getAdminCards,
  type AdminOrderRow,
} from "@/lib/admin.functions";
import { inr, fmtDate } from "@/lib/format";

type AdminOrderStatus =
  "PROCESSING" | "READY_TO_DISPATCH" | "SHIPPED" | "DELIVERED" | "FULFILMENT_EXCEPTION";
type AdminEmailLog = {
  id: string;
  recipient_email: string;
  recipient_name?: string | null;
  event_type: string;
  subject: string;
  delivery_status: string;
  provider_message_id?: string | null;
  last_error?: string | null;
  sent_at?: string | null;
  created_at: string;
};
type AdminCard = { id: string; card_number: string; status: string };

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const qc = useQueryClient();
  const fetchOrdersFn = useServerFn(getAdminOrders);
  const updateStatusFn = useServerFn(updateAdminOrderStatus);
  const assignCardFn = useServerFn(assignAdminOrderCard);
  const fetchEmailsFn = useServerFn(getAdminEmailLogs);
  const retryEmailFn = useServerFn(retryAdminEmail);
  const fetchCardsFn = useServerFn(getAdminCards);

  const [activeTab, setActiveTab] = useState<"orders" | "emails">("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null);
  const [newStatus, setNewStatus] = useState<AdminOrderStatus | "">("");
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Queries
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => (await fetchOrdersFn()) as AdminOrderRow[],
    refetchInterval: 15_000,
  });

  const emailsQuery = useQuery({
    queryKey: ["admin", "emails"],
    queryFn: async () => (await fetchEmailsFn()) as AdminEmailLog[],
    refetchInterval: 30_000,
  });

  const availableCardsQuery = useQuery({
    queryKey: ["admin", "available_cards"],
    queryFn: async () => {
      const cards = await fetchCardsFn();
      return (cards || []).filter((c) => c.status === "AVAILABLE") as AdminCard[];
    },
    enabled: Boolean(selectedOrder && !selectedOrder.card_number),
  });

  const allOrders = ordersQuery.data || [];
  const allEmails = emailsQuery.data || [];

  // Filter orders
  const filteredOrders = allOrders.filter((o) => {
    if (paymentFilter !== "ALL" && o.payment_status !== paymentFilter) return false;
    if (statusFilter !== "ALL" && o.order_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        (o.card_number && o.card_number.toLowerCase().includes(q)) ||
        (o.membership_number && o.membership_number.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Calculate Metrics
  const metrics = {
    total: allOrders.length,
    pendingPayments: allOrders.filter((o) => o.payment_status === "PENDING").length,
    paid: allOrders.filter((o) => o.payment_status === "PAID").length,
    processing: allOrders.filter((o) => o.order_status === "PROCESSING").length,
    readyToDispatch: allOrders.filter((o) => o.order_status === "READY_TO_DISPATCH").length,
    shipped: allOrders.filter((o) => o.order_status === "SHIPPED").length,
    delivered: allOrders.filter((o) => o.order_status === "DELIVERED").length,
    exceptions: allOrders.filter((o) => o.order_status === "FULFILMENT_EXCEPTION").length,
    emailsSent: allEmails.filter((e) => e.delivery_status === "SENT").length,
    emailsFailed: allEmails.filter((e) => e.delivery_status === "FAILED").length,
  };

  const openOrderModal = (order: AdminOrderRow) => {
    setSelectedOrder(order);
    setNewStatus(order.order_status as AdminOrderStatus);
    setCourierName(order.courier_name || "");
    setTrackingNumber(order.tracking_number || "");
    setTrackingUrl(order.tracking_url || "");
    setAdminNotes("");
    setSelectedCardId("");
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setIsUpdating(true);
    try {
      await updateStatusFn({
        data: {
          orderId: selectedOrder.id,
          status: newStatus,
          courierName: courierName.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          notes: adminNotes.trim() || null,
        },
      });

      toast.success(`Order status updated to ${newStatus}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "emails"] });
      setSelectedOrder(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignCard = async () => {
    if (!selectedOrder || !selectedCardId) {
      toast.error("Please select a physical card to assign");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await assignCardFn({
        data: {
          orderId: selectedOrder.id,
          cardId: selectedCardId,
        },
      });

      toast.success(`Assigned physical card: ${res.card_number}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
      setSelectedOrder(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign physical card");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetryEmail = async (notificationId: string) => {
    try {
      await retryEmailFn({ data: { notificationId } });
      toast.success("Email notification re-queued for delivery");
      qc.invalidateQueries({ queryKey: ["admin", "emails"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to retry email");
    }
  };

  const handleExportCsv = () => {
    downloadCsv(`pennygrade-membership-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        "Order Number",
        "Date",
        "Customer Name",
        "Email",
        "Mobile",
        "Amount (INR)",
        "Payment Status",
        "Fulfilment Status",
        "Assigned Card",
        "Membership Number",
        "Delivery Address",
        "City",
        "Courier",
        "Tracking #",
      ],
      ...filteredOrders.map((o) => [
        o.order_number,
        o.created_at,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.amount,
        o.payment_status,
        o.order_status,
        o.card_number || "—",
        o.membership_number || "—",
        o.delivery_address,
        o.delivery_city,
        o.courier_name || "—",
        o.tracking_number || "—",
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Orders & Card Fulfilment"
        desc="Manage online membership purchases, assign printed cards, track courier dispatch, and inspect Resend transactional notifications."
        actions={
          <Button size="sm" variant="outline" onClick={handleExportCsv} className="cursor-pointer">
            Export Orders CSV
          </Button>
        }
      />

      {/* Top Fulfilment Status Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Orders
          </div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Paid Orders
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-700">{metrics.paid}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Processing
          </div>
          <div className="mt-1 text-2xl font-extrabold text-amber-700">{metrics.processing}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            Awaiting Dispatch
          </div>
          <div className="mt-1 text-2xl font-extrabold text-indigo-700">
            {metrics.readyToDispatch}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
            Dispatched
          </div>
          <div className="mt-1 text-2xl font-extrabold text-blue-700">{metrics.shipped}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Delivered
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-800">{metrics.delivered}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
            Exceptions
          </div>
          <div className="mt-1 text-2xl font-extrabold text-red-600">{metrics.exceptions}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
            Emails Sent
          </div>
          <div className="mt-1 text-2xl font-extrabold text-purple-700">{metrics.emailsSent}</div>
        </div>
      </div>

      {/* Main Tabs: Orders List vs Email Notifications Log */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "orders"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Package className="h-4 w-4" /> Membership Orders ({allOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emails")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "emails"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Mail className="h-4 w-4" /> Email Notifications Log ({allEmails.length})
        </button>
      </div>

      {/* TAB 1: ORDERS LIST */}
      {activeTab === "orders" && (
        <div className="space-y-4 pt-2">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Order #, Customer, Email, Mobile, Card #…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-lg border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={paymentFilter} onChange={setPaymentFilter} className="h-10 text-xs">
                <option value="ALL">Payment: All</option>
                <option value="PAID">Payment: PAID</option>
                <option value="PENDING">Payment: PENDING</option>
                <option value="FAILED">Payment: FAILED</option>
              </Select>
              <Select value={statusFilter} onChange={setStatusFilter} className="h-10 text-xs">
                <option value="ALL">Status: All</option>
                <option value="PAYMENT_PENDING">Status: PAYMENT_PENDING</option>
                <option value="PAID">Status: PAID</option>
                <option value="PROCESSING">Status: PROCESSING</option>
                <option value="READY_TO_DISPATCH">Status: READY_TO_DISPATCH</option>
                <option value="SHIPPED">Status: SHIPPED</option>
                <option value="DELIVERED">Status: DELIVERED</option>
                <option value="FULFILMENT_EXCEPTION">Status: EXCEPTION</option>
              </Select>
            </div>
          </div>

          {/* Orders Table */}
          {ordersQuery.isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              head={[
                "Order #",
                "Customer Details",
                "Plan & Amount",
                "Payment",
                "Fulfilment Status",
                "Assigned Card",
                "Destination",
                "Date",
                "Action",
              ]}
              empty={filteredOrders.length === 0}
            >
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className={`${td} font-mono font-bold text-slate-900`}>{o.order_number}</td>
                  <td className={td}>
                    <div className="font-bold text-slate-900">{o.customer_name}</div>
                    <div className="text-slate-500 text-[11px]">
                      {o.customer_email} • {o.customer_phone}
                    </div>
                  </td>
                  <td className={td}>
                    <div className="font-semibold text-slate-900">{inr(o.amount)}</div>
                    <div className="text-[11px] text-slate-500">{o.plan_name}</div>
                  </td>
                  <td className={td}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.payment_status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : o.payment_status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {o.payment_status}
                    </span>
                  </td>
                  <td className={td}>
                    <StatusBadge status={o.order_status} />
                  </td>
                  <td className={`${td} font-mono text-xs`}>
                    {o.card_number ? (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {o.card_number}
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold italic text-[11px]">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className={`${td} text-xs text-slate-600`}>
                    {o.delivery_city}, {o.delivery_pincode}
                  </td>
                  <td className={`${td} text-xs text-slate-500`}>{fmtDate(o.created_at)}</td>
                  <td className={td}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openOrderModal(o)}
                      className="h-8 text-xs font-bold cursor-pointer"
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {/* TAB 2: EMAIL NOTIFICATIONS LOG */}
      {activeTab === "emails" && (
        <div className="space-y-4 pt-2">
          {emailsQuery.isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              head={[
                "Recipient",
                "Event Type",
                "Subject",
                "Delivery Status",
                "Provider ID",
                "Sent At",
                "Actions",
              ]}
              empty={allEmails.length === 0}
            >
              {allEmails.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className={td}>
                    <div className="font-bold text-slate-900">{e.recipient_email}</div>
                    {e.recipient_name && (
                      <div className="text-[11px] text-slate-500">{e.recipient_name}</div>
                    )}
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                      {e.event_type}
                    </span>
                  </td>
                  <td className={`${td} text-xs font-medium text-slate-700 max-w-xs truncate`}>
                    {e.subject}
                  </td>
                  <td className={td}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.delivery_status === "SENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : e.delivery_status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {e.delivery_status}
                    </span>
                    {e.last_error && (
                      <div className="text-[10px] text-red-500 mt-0.5 truncate max-w-xs">
                        {e.last_error}
                      </div>
                    )}
                  </td>
                  <td className={`${td} font-mono text-[11px] text-slate-500`}>
                    {e.provider_message_id || "—"}
                  </td>
                  <td className={`${td} text-xs text-slate-500`}>
                    {e.sent_at ? fmtDate(e.sent_at) : fmtDate(e.created_at)}
                  </td>
                  <td className={td}>
                    {e.delivery_status !== "SENT" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRetryEmail(e.id)}
                        className="h-7 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {/* Order Fulfilment & Management Modal */}
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {selectedOrder?.order_number}
                </span>
                <span className="ml-2 text-xs text-slate-500">Fulfilment & Dispatch Desk</span>
              </div>
              {selectedOrder && <StatusBadge status={selectedOrder.order_status} />}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 pt-2 text-xs">
              {/* Customer & Address Details */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Customer Information
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedOrder.customer_name}
                  </div>
                  <div className="text-slate-600 mt-0.5">{selectedOrder.customer_email}</div>
                  <div className="text-slate-600">{selectedOrder.customer_phone}</div>
                </div>

                <div>
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Delivery Destination
                  </div>
                  <div className="font-semibold text-slate-800 leading-relaxed">
                    {selectedOrder.delivery_address}
                  </div>
                  <div className="text-slate-600">
                    {selectedOrder.delivery_city}, {selectedOrder.delivery_state} -{" "}
                    {selectedOrder.delivery_pincode}
                  </div>
                </div>
              </div>

              {/* Physical Card Allocation Section */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-amber-500" />
                    <span>Allocated Physical Card</span>
                  </div>
                  {selectedOrder.card_number ? (
                    <span className="font-mono font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {selectedOrder.card_number}
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold">Unassigned (Exception)</span>
                  )}
                </div>

                {!selectedOrder.card_number && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <Label className="text-[11px] font-bold text-slate-700">
                      Assign Available Card From Inventory
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedCardId}
                        onChange={setSelectedCardId}
                        className="flex-1 text-xs"
                      >
                        <option value="">Select an available card…</option>
                        {(availableCardsQuery.data || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.card_number}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAssignCard}
                        disabled={!selectedCardId || isUpdating}
                        className="bg-amber-600 font-bold text-white hover:bg-amber-700"
                      >
                        Assign Card
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fulfilment Status Update Section */}
              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Update Fulfilment Status & Courier Details</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">
                      Fulfilment Status
                    </Label>
                    <Select
                      value={newStatus}
                      onChange={(value) => setNewStatus(value as AdminOrderStatus | "")}
                      className="mt-1 w-full text-xs"
                    >
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="READY_TO_DISPATCH">READY_TO_DISPATCH</option>
                      <option value="SHIPPED">SHIPPED (Triggers Dispatch Email)</option>
                      <option value="DELIVERED">DELIVERED (Triggers Delivery Email)</option>
                      <option value="FULFILMENT_EXCEPTION">FULFILMENT_EXCEPTION</option>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Courier Name</Label>
                    <Input
                      placeholder="e.g. DTDC, Blue Dart, Local Handover"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="mt-1 h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">
                      Tracking Code / Number
                    </Label>
                    <Input
                      placeholder="e.g. D12345678"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="mt-1 h-9 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">
                      Courier Tracking URL
                    </Label>
                    <Input
                      placeholder="https://track.courier.com/..."
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      className="mt-1 h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Internal Admin Notes
                  </Label>
                  <Input
                    placeholder="Add dispatch notes or handover instructions…"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="mt-1 h-9 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrder(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              disabled={isUpdating}
              className="bg-amber-600 font-bold text-white hover:bg-amber-700"
            >
              {isUpdating ? "Saving Changes…" : "Save Status & Trigger Notifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
