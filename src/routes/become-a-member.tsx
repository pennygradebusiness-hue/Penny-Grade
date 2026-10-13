import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  Gift,
  HelpCircle,
  Truck,
  Check,
  ChevronRight,
} from "lucide-react";
import { Wordmark, PhysicalCardPreview, LOGO_URL } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitMemberApplication } from "@/lib/admin.functions";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/become-a-member")({
  head: () =>
    buildPageHead({
      title: "Become a Member | Apply for PennyGrade Physical Card",
      description:
        "Apply for your PennyGrade physical membership card. Enjoy exclusive verified in-person discounts across cafés, restaurants, salons, and stores in Daltonganj. ₹500 for 6 months.",
      path: "/become-a-member",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Become a Member", path: "/become-a-member" },
      ]),
    }),
  component: BecomeAMemberPage,
});

function BecomeAMemberPage() {
  const submitFn = useServerFn(submitMemberApplication);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Daltonganj");
  const [delivery, setDelivery] = useState("Direct Handover in Daltonganj (Free)");
  const [payment, setPayment] = useState("Pay Upon Card Handover & Verification");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [submittedApp, setSubmittedApp] = useState<{
    applicationNumber: string;
    fullName: string;
    mobile: string;
    city: string;
    delivery: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setBusy(true);
    try {
      const res = await submitFn({
        data: {
          full_name: fullName.trim(),
          mobile: cleanMobile,
          email: email.trim().toLowerCase(),
          city: city.trim(),
          delivery_preference: delivery,
          payment_preference: payment,
          notes: notes.trim(),
        },
      });

      if (res && res.ok) {
        toast.success("Membership application received!");
        setSubmittedApp({
          applicationNumber: res.application_number,
          fullName: fullName.trim(),
          mobile: cleanMobile,
          city: city.trim(),
          delivery,
        });
      } else {
        toast.error("Could not submit application. Please try again.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc]">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-amber-50/20 to-[#fafafc] pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Breadcrumb & City Badge */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-6">
            <Link to="/" className="hover:text-amber-600 transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-slate-800">Become a Member</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs">
              <MapPin className="h-3 w-3 text-amber-600" />
              Live in Daltonganj & Jharkhand
            </span>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs mb-5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Exclusive Invitation · Limited Privilege Cards
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Unlock Daily Savings Across Top Venues in Daltonganj.
              </h1>

              <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                PennyGrade gives you an authentic, luxury physical membership card granting instant
                <strong className="text-slate-900 font-bold"> 10%–20% discounts </strong>
                at curated cafés, dining spots, luxury hotels, gyms, and grooming salons across
                Daltonganj.
              </p>

              {/* Quick Perks */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 font-bold text-sm">
                    ₹500
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-800">6 Months Validity</p>
                  <p className="text-[11px] text-slate-500">Unlimited redemptions</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                    10-20%
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-800">Direct Discount</p>
                  <p className="text-[11px] text-slate-500">Applied instantly on bill</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                    💳
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-800">Physical Card</p>
                  <p className="text-[11px] text-slate-500">Delivered to your address</p>
                </div>
              </div>
            </div>

            {/* Right Card Mockup Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm">
                <PhysicalCardPreview code="PEN-7X4P-92LM" />
                <p className="mt-3 text-center text-[11px] font-medium text-slate-500">
                  Every card contains a cryptographically unique identifier and gold holographic
                  seal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Form Column */}
          <div className="lg:col-span-7">
            {submittedApp ? (
              /* Success / Verification Card */
              <div className="rounded-2xl border-2 border-amber-300 bg-white p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                      Application Received · Verification Pending
                    </span>
                    <h2 className="mt-1 font-display text-2xl font-black text-slate-900">
                      Thank You, {submittedApp.fullName}!
                    </h2>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">Application Reference</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {submittedApp.applicationNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">Registered Contact</span>
                    <span className="font-semibold text-slate-900">+91 {submittedApp.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">City</span>
                    <span className="font-semibold text-slate-900">{submittedApp.city}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Card Delivery</span>
                    <span className="font-semibold text-slate-900">{submittedApp.delivery}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200/80 p-4 text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-[13px]">
                    <Clock className="h-4 w-4 text-amber-700" />
                    What Happens Next?
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    <li>
                      Our PennyGrade membership manager will call you within{" "}
                      <strong>24 hours</strong> to verify your address.
                    </li>
                    <li>
                      We issue and encode your official physical PennyGrade card (`PEN-XXXX-XXXX`).
                    </li>
                    <li>
                      The card is handed over to you directly, ready to use immediately at ABC Café,
                      FitZone, and all partner venues.
                    </li>
                  </ol>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md hover:from-amber-400 hover:to-amber-500 flex-1"
                  >
                    <Link to="/partners">
                      Explore Partner Venues <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => setSubmittedApp(null)}
                  >
                    Submit Another Application
                  </Button>
                </div>
              </div>
            ) : (
              /* Application Form */
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <span className="rounded-md bg-amber-100/70 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-800">
                    Step 1 of 2 · Member Details
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
                    Apply for Your PennyGrade Card
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Fill in your details below. Our team will contact you to verify and coordinate
                    physical card delivery.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Samir Pandey"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="mt-1.5 h-10 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mobile" className="text-xs font-bold text-slate-700">
                        Mobile Number (10 digits) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">
                          +91
                        </span>
                        <Input
                          id="mobile"
                          placeholder="9876543210"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          maxLength={10}
                          required
                          className="h-10 pl-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-xs font-bold text-slate-700">
                        City / Location <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="Daltonganj">Daltonganj (Palamu)</option>
                        <option value="Ranchi">Ranchi</option>
                        <option value="Garhwa">Garhwa</option>
                        <option value="Latehar">Latehar</option>
                        <option value="Other">Other City in Jharkhand</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="delivery" className="text-xs font-bold text-slate-700">
                        Delivery Preference
                      </Label>
                      <select
                        id="delivery"
                        value={delivery}
                        onChange={(e) => setDelivery(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="Direct Handover in Daltonganj (Free)">
                          Direct Handover in Daltonganj (Free)
                        </option>
                        <option value="Courier to Residential / Office Address">
                          Courier to Address (₹50 extra)
                        </option>
                        <option value="Pickup at ABC Café / Partner Venue">
                          Pickup at Partner Venue
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment" className="text-xs font-bold text-slate-700">
                      Payment Mode
                    </Label>
                    <select
                      id="payment"
                      value={payment}
                      onChange={(e) => setPayment(e.target.value)}
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Pay Upon Card Handover & Verification">
                        Pay ₹500 Upon Card Handover & Verification
                      </option>
                      <option value="UPI Payment upon Member Call Confirmation">
                        UPI Payment upon Call Confirmation
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
                      Delivery Address / Special Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g. Near Red Cross Mor, Daltonganj. Best time to call: evening after 5 PM."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1.5 rounded-xl resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Pricing Summary Box */}
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                      <span>PennyGrade 6-Month Membership</span>
                      <span className="font-bold text-sm">₹500 / 6 months</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Includes 1 Official Embossed Physical Card + Digital Barcode Verification. No
                      hidden charges.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 text-sm"
                  >
                    {busy ? "Submitting Application…" : "Submit Application for Verification"}
                  </Button>

                  <p className="text-center text-[11px] text-slate-400">
                    By submitting, you agree to receive a verification call or WhatsApp message from
                    our team.
                  </p>
                </form>
              </div>
            )}
          </div>

          {/* Right Explanations & FAQ */}
          <div className="lg:col-span-5 space-y-6">
            {/* Why Join Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-600" />
                Why Become a Member?
              </h3>

              <div className="mt-4 space-y-3.5 text-xs text-slate-600">
                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Guaranteed 10%–20% OFF:</strong>
                    <p className="text-slate-500 mt-0.5">
                      Applies across all participating dining, hotel, café, fitness, and salon
                      partners.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Physical Card + QR Scanner:</strong>
                    <p className="text-slate-500 mt-0.5">
                      Simply show your physical card or scan the venue counter QR for instant
                      approval.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">6 Months of Unlimited Usage:</strong>
                    <p className="text-slate-500 mt-0.5">
                      No limits on how many times you can visit your favourite café or gym in 6
                      months.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Direct Payback in 2 Visits:</strong>
                    <p className="text-slate-500 mt-0.5">
                      A ₹3,000 hotel stay or ₹1,500 café bill immediately saves ₹300–₹600!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Assistance Hotline Box */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-slate-500" />
                Have Questions Before Applying?
              </h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Our local support desk in Daltonganj is available to answer any questions about
                memberships, partner venues, and corporate packages.
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <a
                  href="tel:+919356897893"
                  className="flex items-center gap-2 font-semibold text-slate-800 hover:text-amber-600 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-amber-600" />
                  <span>Call: +91 93568 97893</span>
                </a>
                <a
                  href="mailto:pennygradebusiness@gmail.com"
                  className="flex items-center gap-2 font-semibold text-slate-800 hover:text-amber-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-amber-600" />
                  <span>Email: pennygradebusiness@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
