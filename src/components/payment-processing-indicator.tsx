import { LoaderCircle } from "lucide-react";

export function PaymentProcessingIndicator({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900"
    >
      <LoaderCircle aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
      <span>{message}</span>
    </div>
  );
}

export function PaymentProcessingOverlay({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      aria-busy="true"
      className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blue-50 ring-8 ring-blue-50/60">
          <LoaderCircle aria-hidden="true" className="h-12 w-12 animate-spin text-blue-600" />
        </div>
        <h2 className="mt-6 text-xl font-extrabold text-slate-900">Processing your payment</h2>
        <p className="mt-2 text-sm font-semibold text-blue-800">{message}</p>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Keep this page open. We’ll update your order as soon as payment is verified.
        </p>
        <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
