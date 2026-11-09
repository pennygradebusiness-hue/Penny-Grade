from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Flowable
from reportlab.lib.utils import ImageReader


OUT = Path("output/pdf/razorpay-readiness")
OUT.mkdir(parents=True, exist_ok=True)
NAVY = colors.HexColor("#172338")
GOLD = colors.HexColor("#E5A321")
MUTED = colors.HexColor("#5B6575")
PALE = colors.HexColor("#FFF7E6")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=NAVY, alignment=TA_CENTER, spaceAfter=7))
styles.add(ParagraphStyle(name="Sub", parent=styles["Normal"], fontSize=8.5, leading=12, textColor=MUTED, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontSize=11, leading=14, textColor=NAVY, spaceBefore=9, spaceAfter=4))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontSize=8.5, leading=12, textColor=colors.HexColor("#273244"), spaceAfter=4))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontSize=7.5, leading=10, textColor=MUTED))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.HexColor("#624300"), backColor=PALE, borderColor=GOLD, borderWidth=0.7, borderPadding=7, spaceBefore=4, spaceAfter=8))

docs = [
("01_Business_Overview.pdf", "Business Overview", [
("Purpose", "PennyGrade is a local privilege and membership network concept operated under the PennyGrade brand. The current product is a six-month physical membership card with access to participating partner benefits that are listed with their terms."),
("Current checkout model", "The website code describes a customer membership purchase priced at INR 500 for 180 days, with physical card delivery currently limited to Daltonganj, Jharkhand. The customer pays participating businesses directly for their own goods and services. PennyGrade does not collect the partner's retail bill in this flow."),
("Business identity", "Operating contact shown in the website: Samir Pandey / PennyGrade; pennygradebusiness@gmail.com; +91 93568 97893; Daltonganj, Palamu, Jharkhand 822101. Confirm the legal name, proprietor status, address and contact details against KYC documents before external submission."),
("Network evidence", "No verified live partner count is asserted in this document. A listing should be treated as participating only after business checks, a mutually signed agreement, and recorded benefit terms."),
]),
("02_Membership_Product_Description.pdf", "Membership Product Description", [
("Product", "PennyGrade Six-Month Physical Membership Card. Current stated price: INR 500. Current stated validity: 180 days. Current checkout includes one physical card and local delivery in Daltonganj, Jharkhand."),
("What payment buys", "A personal membership record, a physical identifier after verified payment and stock assignment, access to public partner discovery, server-side membership verification, and the benefit terms displayed for currently active participating partners."),
("Payment and partner bills", "PennyGrade collects only its own membership fee in the checkout flow. Members pay each partner directly for purchases at that business. No partner subscription, commission, pooled bill collection or settlement is represented here."),
("Availability condition", "The application now checks database card inventory before creating a payment order. Purchase should remain unavailable if stock cannot be confirmed or is zero. Card allocation and membership activation occur only after payment verification."),
]),
("03_Membership_Benefits.pdf", "Membership Benefits Matrix", [
("Active in the current product", "Member identity: membership/card number and six-month validity, recorded by the membership system. Access: physical card plus server-side verification workflow. Business discovery: website partner directory and listings. Listed partner benefits: only those shown as active, within validity dates and subject to each listing's conditions. Member assistance: published email/phone contact; no ticketing SLA is claimed."),
("Not currently evidenced as operational", "Verified email or mobile OTP; member-exclusive announcement system; member event programme; self-service card replacement; automated renewal; member support ticket/complaint dashboard. Do not advertise these as available until built and staffed."),
("Benefit access", "Member presents the card, opens the online verification flow, and follows the active offer's conditions. The partner verifies the live result and applies its agreed benefit. Member pays the partner directly."),
("Additional cost", "Membership price is currently INR 500 for six months. Partner purchases are paid directly to the partner at its own prices after any applicable offer. Any delivery charge must match checkout; checkout currently shows free delivery in the eligible local area."),
]),
("04_Partner_Network_Overview.pdf", "Partner Network Overview", [
("Current evidence position", "No partner count or named active partner is certified by this pack. Existing seeded/sample records are not evidence of a real partnership and must not be included as contracted partners."),
("Onboarding sequence", "Receive enquiry; verify business identity, address and authorised representative; agree the specific member benefit and conditions; execute a written agreement; securely retain its reference; record a member issue contact; then activate the public listing and offer."),
("Roster fields", "Business name and category; address; contact; authorised representative; verification date; signed agreement reference/date; agreed benefit; minimum bill/cap/exclusions; effective and end dates; member issue contact; current status; review date."),
("Publication control", "Application and database safeguards require verification and agreement evidence before activating a partner. Existing rows without these details remain stored but are excluded from public results after the reviewed database migration is applied."),
]),
("05_Sample_Membership_Card.pdf", "Sample Membership Card", [
("Specimen", "NOT VALID - SPECIMEN ONLY"),
("Front copy", "PENNYGRADE | LOCAL PRIVILEGE & MEMBERSHIP NETWORK | MEMBER NAME: [SAMPLE MEMBER] | MEMBERSHIP ID: [NOT ISSUED] | VALIDITY: [START DATE] TO [EXPIRY DATE]"),
("Back copy", "Present this card and follow the live PennyGrade verification process. Partner benefits and terms vary by listing. Member pays the partner directly. Support: pennygradebusiness@gmail.com | +91 93568 97893"),
("Production note", "This page is a text specimen, not a manufactured card, valid membership or proof of card inventory. Use a genuine photo of the physical PVC card before merchant onboarding; do not put a real member's details in a sample."),
]),
("06_Sample_Customer_Invoice.pdf", "Illustrative Membership Receipt Layout", [
("Status", "Illustrative blank layout only. Not an issued invoice, tax invoice, receipt, or evidence of a transaction."),
("Seller", "Legal seller name: [CONFIRM FROM KYC] | Business address: [CONFIRM] | PAN/GSTIN, if applicable: [ENTER ONLY IF VALID AND APPLICABLE]"),
("Customer and order", "Customer: [CUSTOMER NAME] | Order reference: [SYSTEM-GENERATED REFERENCE] | Date: [ACTUAL PAYMENT DATE] | Payment reference: [PROVIDER REFERENCE]"),
("Line item", "PennyGrade Six-Month Physical Membership Card | Term: 180 days from activation | Qty: 1 | Membership fee: INR 500 (confirm active plan price before issue) | Delivery: included for currently supported Daltonganj area as displayed at checkout."),
("Tax and issue", "Tax treatment and invoice wording must be confirmed by a qualified Indian tax professional. Populate only from a real paid order and valid business records. Never send this blank specimen as a customer receipt."),
]),
("07_Customer_Journey.pdf", "Customer Journey", [
("Purchase", "Customer reviews membership product, price, delivery coverage, membership/refund terms and enters name, email, mobile and delivery address. Current source validates format; it does not perform OTP verification."),
("Payment and activation", "Server creates the payment order using the active plan and confirmed card inventory. Payment callback/webhook is checked server-side; successful verification triggers atomic card assignment and membership activation. Order/payment reference is retained."),
("Fulfilment", "Confirmation is sent through configured email workflow; operations prepare and dispatch/hand over the physical card; dispatch and tracking details are entered by an operator; customer can use order tracking."),
("Use and support", "Member explores eligible public listings, presents card, obtains live online verification, and pays the partner directly. Membership/order issues go to published support contacts. Email consent and notification preferences require operational confirmation."),
]),
("08_Payment_Flow_Explanation.pdf", "Payment Flow Explanation", [
("What PennyGrade charges", "One membership fee currently shown as INR 500 for the six-month membership. This payment is for PennyGrade's own product."),
("Checkout controls", "Active plan price is read server-side. Before a payment order is created, the production database inventory must confirm available physical stock. Inventory lookup errors and zero stock now stop checkout; local JSON/demo inventory is not a production stock source."),
("Verification and fulfilment", "Payment signature and provider status are validated server-side. Webhook signature/replay handling and idempotent fulfilment are implemented in source. Membership is activated only after confirmed payment; card assignment uses database inventory in the production flow."),
("Partner sale", "Member's later purchase from a restaurant, salon, retailer or other partner is a separate transaction. Customer pays the partner directly. PennyGrade does not collect or settle that partner bill."),
("Limits", "This pack does not claim Razorpay approval, live credentials, live payment execution, live webhook delivery, refund settlement or production deployment."),
]),
("09_Physical_Fulfilment_Process.pdf", "Physical Card Fulfilment", [
("Sequence", "Verified payment -> atomic available-card assignment -> membership activation -> order confirmation -> pack and quality-check card -> record handover/courier and tracking details -> track delivery -> record delivery or exception."),
("Inventory control", "Production inventory is in Supabase. The payment-order path fails closed if inventory cannot be read or no stock is available. It does not create an invented physical card number to satisfy an order."),
("Exceptions", "A paid order without an assigned card is a fulfilment exception requiring prompt manual follow-up and customer communication. Stock should be monitored before checkout opens; never describe a card as assigned until the database assignment succeeds."),
("Evidence to retain", "Order and payment reference; allocated physical card record; packing check; dispatch date; delivery provider and tracking ID where applicable; delivery outcome; support/refund correspondence."),
]),
("10_Shipping_Policy.pdf", "Shipping and Delivery Policy", [
("Coverage and charge", "Current checkout accepts Daltonganj, Jharkhand addresses and shows free shipping. Do not promise service outside the supported area or charge an unshown delivery fee."),
("Timing", "The website does not currently promise a fixed processing or delivery timeframe. Before accepting payment, operations should provide a realistic estimate at checkout or to the customer. An estimate should be identified as such."),
("Tracking and failures", "Use the order tracking page after dispatch data is recorded. For a missed delivery, verify the address and provider status and coordinate a reattempt/return handling with the customer. Confirm any additional delivery charge before incurring it."),
("Damage", "Ask the customer to report a physically defective/unreadable card within seven days with order reference and evidence; review and arrange a replacement where confirmed, subject to applicable consumer rights."),
]),
("11_Cancellation_Refund_Policy.pdf", "Cancellation and Refund Policy", [
("Before production", "A customer can request cancellation before card personalisation/production by contacting support with the order reference. Review the actual order state; cancellation and refund are not automatic from an email request."),
("After production or dispatch", "The published membership terms currently state fees are generally non-refundable after production, dispatch/delivery or activation. Review each request and applicable consumer rights; do not use this wording to exclude a mandatory remedy."),
("Duplicate or failed debit", "Review provider records. Duplicate confirmed charges should be handled as duplicate payment cases. If payment appears debited but the order is unpaid, ask for the transaction reference and reconcile provider/bank status."),
 ("Defective card and processing", "Report a damaged/unreadable card within seven days of delivery for review and replacement where confirmed. A complete refund request is targeted for decision within four business days. Approved refunds are initiated to the original method within five business days of approval; the payment provider/bank controls posting time. No customer self-serve refund workflow is currently claimed."),
]),
("12_Privacy_Policy.pdf", "Privacy Policy Summary", [
("Data used", "Name, email, phone, membership/order/card identifiers, delivery address, partner verification/redemption data, and security/admin logs as needed for purchase, membership, fulfilment, support, fraud prevention and legal recordkeeping."),
("Service providers", "Supabase for database/authentication; Razorpay only if approved/enabled for checkout payment processing; Resend for transactional emails; courier/local delivery provider for card fulfilment; hosting/security providers for website operation."),
("Partner disclosure", "Partner staff need to verify membership and offer eligibility; they should not receive member marketing contact details through the verification screen. Dispute contact details are for service resolution."),
("Legal review", "This summary is operational, not a legal opinion. Privacy notice, lawful bases, consent, rights process, retention, grievance contact, processors and applicable commencement dates need review by Indian privacy counsel."),
]),
("13_Terms_Conditions.pdf", "Terms and Conditions Summary", [
("Membership", "Current product: INR 500 for six months/180 days, physical card included, delivery currently limited to Daltonganj, Jharkhand. The active checkout plan controls if details change."),
("Partner benefits", "Availability, offer validity, minimum bill, cap, eligible products, exclusions and redemption limits are set by each participating partner listing. Partner collects payment for its own goods/services directly."),
("Verification and conduct", "A membership is personal and subject to active status and valid dates. A live server verification result, not a screenshot or verbal claim, is used by the partner to check an offer."),
("Review required", "Final terms require Indian consumer/privacy/tax legal review. Confirm identity, support response capability, refund clauses, renewal choices, consumer remedies and dispute contacts before publishing as final."),
]),
("14_Merchant_Partnership_Agreement.pdf", "Merchant Agreement - Unsigned Template", [
("Status", "DRAFT TEMPLATE - NOT EXECUTED. No partner is bound by this document until both authorised parties complete and sign the specific schedule."),
("Parties and verification", "PennyGrade operating/legal name: [CONFIRM FROM BUSINESS DOCUMENTS]. Partner legal/trade name: [FILL]. Address and authorised signatory: [FILL AND VERIFY]. Each party remains independently operated."),
("Benefit schedule", "Benefit description: [AGREE]. Minimum bill/cap/exclusions: [AGREE]. Effective/end dates: [AGREE]. Verification procedure: live PennyGrade verification. Member issue contact: [AGREE]. Review date: [AGREE]."),
("Payment, data, term", "Customer pays the partner directly for partner purchases. Any fee/commission or material cost must be expressly agreed in the signed schedule; none is assumed. Include data handling, complaint process, non-exclusivity, suspension/termination and renewal terms after legal review."),
("Execution", "PennyGrade authorised signatory and date: [SIGN]. Partner authorised signatory, title, stamp if used, and date: [SIGN]. Store the signed copy securely and record its internal reference before publication."),
]),
("15_Business_Identity_Documents_Checklist.pdf", "Business Identity Documents Checklist", [
("Identity", "Proprietor PAN and identity/address verification as requested in Razorpay's application. Confirm exact legal and trading names."),
("Business proofs", "Razorpay's published onboarding preparation guide says sole proprietors currently need two accepted business proofs, with the combination dependent on the onboarding route. Use the live application checklist; do not assume a particular document is accepted."),
("Bank and address", "Bank account details/name matching the business route; supporting bank proof if requested. Current business address proof and delivery/support location evidence."),
("Operating evidence", "Signed partner agreements; real card photos/sample; customer invoice layout (actual only for actual paid orders); shipping/replacement/refund process; partner roster with statuses and benefit conditions; website/contact screenshots."),
("Cautions", "No registration/GST/association certificate is asserted by this pack. Whether a document or GSTIN is required depends on legal form, turnover, category and Razorpay's current review. Confirm with Razorpay and a qualified tax professional."),
]),
("16_Razorpay_Category_Eligibility_Questions.pdf", "Razorpay Category Eligibility Questions", [
("Documented", "Razorpay Route documentation lists SOCIAL subcategories including Neighbourhood Network and Associations and Membership. Route supports marketplace/payment splitting use cases. That documentation does not establish that the same category is selectable for standard Payment Gateway onboarding."),
("Unconfirmed", "Standard PG availability of these labels; whether a proprietorship can use them; whether formal society/association registration is required; acceptability of a commercial paid physical membership card; discount benefits; evidence threshold; and reconsideration after a prior coupon/deals category rejection."),
("Ask Razorpay in writing", "For our current legal form and INR 500 / 180-day physical local membership, which standard PG category and subcategory should be used? Is a commercial proprietary network eligible for SOCIAL -> NEIGHBOURHOOD_NETWORK or ASSOCIATIONS_AND_MEMBERSHIP? Is formal association/society registration required? Are physical card plus partner-negotiated discounts allowed? Which partner, fulfilment, refund and business proofs are required? Can a prior category rejection be manually reviewed?"),
("Approval boundary", "Razorpay makes the final eligibility and category decision. Do not select a category solely because it appears in Route documentation. Provide a truthful business description and the evidence requested in the live application."),
]),
]


class CardSpecimen(Flowable):
    def __init__(self, image_path):
        super().__init__()
        self.image_path = str(image_path)
        self.width = 165 * mm
        self.height = 94 * mm

    def draw(self):
        self.canv.drawImage(ImageReader(self.image_path), 0, 0, width=self.width, height=self.height, preserveAspectRatio=True, mask="auto")
        # The supplied mockup contains a seeded/example identifier. Cover it so
        # no sample credential is mistaken for an issued card number.
        self.canv.setFillColor(NAVY)
        self.canv.roundRect(10 * mm, 13 * mm, 60 * mm, 9 * mm, 1.5 * mm, fill=1, stroke=0)
        self.canv.setFillColor(colors.white)
        self.canv.setFont("Helvetica-Bold", 6.5)
        self.canv.drawString(12 * mm, 16 * mm, "SPECIMEN - NO VALID MEMBER ID")


def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.1)
    canvas.line(18 * mm, 16 * mm, w - 18 * mm, 16 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 11 * mm, "PennyGrade | Readiness preparation only | Drafted 09 Nov 2026")
    canvas.drawRightString(w - 18 * mm, 11 * mm, f"Page {doc.page}")
    canvas.restoreState()


for filename, title, sections in docs:
    path = OUT / filename
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=19 * mm, leftMargin=19 * mm, topMargin=17 * mm, bottomMargin=22 * mm, title=title, author="PennyGrade")
    story = [Paragraph(escape(title), styles["DocTitle"]), Paragraph("PENNYGRADE | RAZORPAY MERCHANT READINESS PREPARATION", styles["Sub"]), Paragraph("DRAFT - Internal preparation document. Not proof of approval, registration, signed partnership, issued card, or customer transaction.", styles["Callout"]), Spacer(1, 3 * mm)]
    if filename.startswith("05_"):
        story.extend([CardSpecimen(Path("public/pennygrade-card.webp")), Spacer(1, 4 * mm)])
    for heading, body in sections:
        story.append(KeepTogether([Paragraph(escape(heading), styles["H2x"]), Paragraph(escape(body), styles["Bodyx"])]))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Before external submission: verify every stated fact against current operations and business records. Razorpay and qualified legal/tax advisers make their own determinations.", styles["Smallx"]))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

print(f"Created {len(docs)} readiness PDFs under {OUT.resolve()}")
