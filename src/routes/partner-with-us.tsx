import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  QrCode,
  Users,
  Store,
  ChevronRight,
  Check,
} from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPartnerApplication } from "@/lib/admin.functions";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/partner-with-us")({
  head: () =>
    buildPageHead({
      title: "Partner With Us | Merchant Onboarding | PennyGrade",
      description:
        "Join the PennyGrade partner merchant network. Attract high-intent repeat customers to your café, restaurant, salon, hotel, or store with zero hardware and zero POS changes.",
      path: "/partner-with-us",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Partner With Us", path: "/partner-with-us" },
      ]),
    }),
  component: PartnerWithUsPage,
});

function PartnerWithUsPage() {
  const submitFn = useServerFn(submitPartnerApplication);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Cafés");
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Daltonganj");
  const [address, setAddress] = useState("");
  const [discount, setDiscount] = useState("10% Off on Total Bill");
  const [minBill, setMinBill] = useState("₹500");
  const [hours, setHours] = useState("Mon–Sun · 10:00 AM – 10:00 PM");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [submittedInquiry, setSubmittedInquiry] = useState<{
    applicationNumber: string;
    businessName: string;
    contactName: string;
    mobile: string;
    city: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || businessName.trim().length < 2) {
      toast.error("Please enter your business or outlet name");
      return;
    }
    if (!contactName.trim() || contactName.trim().length < 2) {
      toast.error("Please enter contact person name");
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
    if (!address.trim()) {
      toast.error("Please provide your outlet address");
      return;
    }

    setBusy(true);
    try {
      const res = await submitFn({
        data: {
          business_name: businessName.trim(),
          category_name: category,
          contact_name: contactName.trim(),
          mobile: cleanMobile,
          email: email.trim().toLowerCase(),
          city: city.trim(),
          address: address.trim(),
          proposed_discount: discount.trim(),
          minimum_bill: minBill.trim(),
          business_hours: hours.trim(),
          notes: notes.trim(),
        },
      });

      if (res && res.ok) {
        toast.success("Partner inquiry submitted successfully!");
        setSubmittedInquiry({
          applicationNumber: res.application_number,
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          mobile: cleanMobile,
          city: city.trim(),
        });
      } else {
        toast.error("Could not submit partner inquiry. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit inquiry");
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
            <Link to="/" className="hover:text-amber-600 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-slate-800">Partner With Us</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs">
              <Store className="h-3 w-3 text-amber-600" />
              Merchant Onboarding in Daltonganj & Jharkhand
            </span>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs mb-5">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                Zero Hardware · Guaranteed High-Value Footfall
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Partner with PennyGrade. Grow Your Local Footfall.
              </h1>

              <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                Join prestigious venues like <strong className="text-slate-900 font-bold">ABC Café, Urban Brew, The Grand Stay, and FitZone</strong>. 
                Welcome affluent, verified PennyGrade cardholders into your establishment with zero complex tech.
              </p>

              {/* Key Merchant Value Pillars */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-slate-900">Zero Hardware Setup</h4>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    We provide a free premium acrylic QR standee. No POS integration or machines needed.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                    <Users className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-slate-900">Affluent Members</h4>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    Attract local professionals, families, and students who dine out and spend regularly.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-bold">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-slate-900">Total Control</h4>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    You choose your discount %, minimum bill requirement, and eligible days of the week.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Standee Visual Box */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25">
                  <QrCode className="h-8 w-8" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-900">
                  Permanent Counter Standee
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Customer scans QR with their smartphone, enters bill total, and shows verified payable amount directly to counter staff.
                </p>

                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 font-medium">
                  ✓ Staff training takes less than 2 minutes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form & Information Section */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Form Column */}
          <div className="lg:col-span-7">
            {submittedInquiry ? (
              /* Success / Inquiry Confirmation */
              <div className="rounded-2xl border-2 border-amber-300 bg-white p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
                      Partner Inquiry Received · Under Review
                    </span>
                    <h2 className="mt-1 font-display text-2xl font-black text-slate-900">
                      Welcome, {submittedInquiry.businessName}!
                    </h2>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">Inquiry Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {submittedInquiry.applicationNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">Contact Person</span>
                    <span className="font-semibold text-slate-900">{submittedInquiry.contactName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500 font-medium">Registered Phone</span>
                    <span className="font-semibold text-slate-900">+91 {submittedInquiry.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Location</span>
                    <span className="font-semibold text-slate-900">{submittedInquiry.city}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200/80 p-4 text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-[13px]">
                    <Clock className="h-4 w-4 text-amber-700" />
                    Onboarding Timeline
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    <li>Our partnership lead in Daltonganj will contact you within <strong>24–48 hours</strong>.</li>
                    <li>We configure your venue page, discount rate, minimum bill, and generate your dedicated QR code.</li>
                    <li>We deliver your free tabletop standee and publish your venue to all PennyGrade members!</li>
                  </ol>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md hover:from-amber-400 hover:to-amber-500 flex-1">
                    <Link to="/partners">
                      View Existing Partners <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => setSubmittedInquiry(null)}
                  >
                    Submit Another Outlet
                  </Button>
                </div>
              </div>
            ) : (
              /* Merchant Partner Application Form */
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <span className="rounded-md bg-amber-100/70 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-800">
                    Merchant Partnership Application
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
                    Register Your Venue with PennyGrade
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Fill in your outlet details below. Our team will review your submission and contact you to arrange setup.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="biz" className="text-xs font-bold text-slate-700">
                        Business / Outlet Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="biz"
                        placeholder="e.g. Royal Biryani House"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category" className="text-xs font-bold text-slate-700">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="Cafés">Cafés & Bakeries</option>
                        <option value="Restaurants">Restaurants & Dining</option>
                        <option value="Hotels">Hotels & Resorts</option>
                        <option value="Salons">Salons, Spa & Grooming</option>
                        <option value="Fitness">Fitness, Gym & Yoga</option>
                        <option value="Shopping">Shopping & Fashion</option>
                        <option value="Entertainment">Entertainment & Activities</option>
                        <option value="Other">Other Category</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="contact" className="text-xs font-bold text-slate-700">
                        Contact Person <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="contact"
                        placeholder="Owner / Manager Name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pmobile" className="text-xs font-bold text-slate-700">
                        Mobile Phone <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">
                          +91
                        </span>
                        <Input
                          id="pmobile"
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
                      <Label htmlFor="pemail" className="text-xs font-bold text-slate-700">
                        Business Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pemail"
                        type="email"
                        placeholder="contact@outlet.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="pcity" className="text-xs font-bold text-slate-700">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="pcity"
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

                    <div className="sm:col-span-2">
                      <Label htmlFor="paddr" className="text-xs font-bold text-slate-700">
                        Full Outlet Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="paddr"
                        placeholder="e.g. Main Market, Near Hospital Chowk, Daltonganj"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pdisc" className="text-xs font-bold text-slate-700">
                        Proposed Member Offer <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pdisc"
                        placeholder="e.g. 10% Off on Food Bill"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        required
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pmin" className="text-xs font-bold text-slate-700">
                        Minimum Bill Threshold
                      </Label>
                      <Input
                        id="pmin"
                        placeholder="e.g. ₹500 (or ₹0 for none)"
                        value={minBill}
                        onChange={(e) => setMinBill(e.target.value)}
                        className="mt-1.5 h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phours" className="text-xs font-bold text-slate-700">
                      Business Operating Hours
                    </Label>
                    <Input
                      id="phours"
                      placeholder="e.g. Mon–Sun · 10:00 AM – 10:00 PM"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="mt-1.5 h-10 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pnotes" className="text-xs font-bold text-slate-700">
                      Additional Details / Remarks (Optional)
                    </Label>
                    <Textarea
                      id="pnotes"
                      placeholder="Special conditions, peak hours, seating capacity, or queries for our onboarding team."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1.5 rounded-xl resize-none"
                      rows={2}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 text-sm"
                  >
                    {busy ? "Submitting Inquiry…" : "Apply for PennyGrade Partnership"}
                  </Button>

                  <p className="text-center text-[11px] text-slate-400">
                    No upfront setup fees. Our representative will visit your location to verify and install your acrylic QR standee.
                  </p>
                </form>
              </div>
            )}
          </div>

          {/* Right Partner FAQ / Benefits */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600" />
                Partner Benefits
              </h3>

              <div className="mt-4 space-y-3.5 text-xs text-slate-600">
                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Free Acrylic Counter Standee:</strong>
                    <p className="text-slate-500 mt-0.5">Custom engraved QR standee delivered to your cashier counter at no charge.</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Featured Catalog Placement:</strong>
                    <p className="text-slate-500 mt-0.5">High-visibility placement on PennyGrade directory, mobile landing, and member newsletters.</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Zero Commission on Sales:</strong>
                    <p className="text-slate-500 mt-0.5">We don't take a percentage of your food or room revenues. You keep 100% of the customer bill.</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="text-slate-800">Tamper-Proof Visual Verification:</strong>
                    <p className="text-slate-500 mt-0.5">Dynamic glowing session screen with real-time countdown prevents duplicate or reused discounts.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Merchant Help Box */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-500" />
                Merchant Onboarding Desk
              </h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Prefer to talk directly with our partnership director in Daltonganj? Call or message our direct merchant line.
              </p>

              <div className="mt-4 space-y-2 text-xs">
                <a
                  href="tel:+919919897039"
                  className="flex items-center gap-2 font-semibold text-slate-800 hover:text-amber-600 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-amber-600" />
                  <span>Merchant Line: +91 99198 97039</span>
                </a>
                <a
                  href="mailto:partners@pennygrade.com"
                  className="flex items-center gap-2 font-semibold text-slate-800 hover:text-amber-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-amber-600" />
                  <span>Email: partners@pennygrade.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
