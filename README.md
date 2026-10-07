# PennyGrade Rewards Hub

# PENNYGRADE — MEMBERSHIP & PARTNER DISCOUNT PLATFORM

Build a complete, production-ready web application called **PennyGrade**.

I will attach the official **PennyGrade logo** with this prompt. Use the uploaded logo as the primary brand identity throughout the application. **Do not redesign, redraw, modify, distort, or replace the logo.** Extract the visual style, colors, and overall brand feel from the provided logo and build the UI around it.

The platform is a **membership-based partner discount network**.

Customers purchase/receive a physical PennyGrade membership card and get access to exclusive discounts at partner businesses such as cafés, restaurants, hotels, salons, gyms, shopping stores, entertainment venues, travel businesses, etc.

The most important requirement:

> **Partner staff must have almost ZERO interaction with the PennyGrade website during a normal transaction.**

The CUSTOMER operates the website.

The partner business only displays a permanent PennyGrade QR code. The customer scans that QR code, enters their bill amount, and receives a temporary live verification screen showing the discount and final payable amount. The customer shows that screen to the partner staff. Staff applies the discount through their normal billing process.

Do NOT create a partner dashboard that staff must use for every transaction.
Do NOT require staff to scan anything.
Do NOT require staff to enter membeeactrship IDs.
Do NOT require WhatsApp.
Do NOT require POS integration.
Do NOT require a mobile app.

---

# 1. PRODUCT NAME

Brand:

**PennyGrade**

Possible positioning:

**One Membership. Exclusive Benefits.**

Alternative supporting copy:

**Unlock exclusive savings across trusted local and lifestyle partners.**

The design should feel:

* Premium
* Modern
* Trustworthy
* Financial/lifestyle oriented
* Clean
* Professional
* Mobile-first
* Easy to understand
* Not overly corporate
* Not childish
* Not cluttered

Use the uploaded PennyGrade logo as the primary brand reference.

---

# 2. CORE BUSINESS MODEL

PennyGrade sells annual memberships.

Example:

**PennyGrade Membership**
₹500 / year

Members receive discounts from participating partner businesses.

Example:

ABC Café offers:

* 10% discount
* Maximum discount ₹500
* Minimum bill ₹500
* Monday–Sunday
* Unlimited usage
* Additional terms if configured by admin

Customer visits ABC Café.

Customer:

1. Logs into PennyGrade.
2. Scans the permanent ABC Café PennyGrade QR code.
3. Website automatically identifies ABC Café.
4. Website automatically identifies the logged-in customer's active membership.
5. Customer enters bill amount.
6. Backend validates the membership and offer.
7. Backend calculates discount.
8. Website creates a temporary verification session.
9. Customer sees a live verification screen.
10. Customer shows the screen to ABC Café staff.
11. Staff applies the displayed discount in their normal billing system.

The offer is NOT consumed.

If the offer is unlimited, the member can use it again later according to the offer's conditions.

---

# 3. CRITICAL UX PRINCIPLE

The system has two very different users:

## CUSTOMER

Customer actively uses the website.

They can:

* Register
* Login
* View membership
* View membership expiry
* Browse partners
* Browse categories
* View offers
* Scan partner QR
* Enter bill amount
* Generate discount verification
* Show verification screen
* View verification history
* Manage profile

## ADMIN

Admin manages the entire PennyGrade ecosystem.

Admin can:

* Manage members
* Manage physical cards
* Manage membership plans
* Manage categories
* Manage partners
* Manage offers
* Generate partner QR codes
* View verification logs
* View analytics
* Manage administrators
* View audit logs

## PARTNER STAFF

Partner staff should NOT need to use PennyGrade during normal transactions.

They only:

1. See customer's live verification screen.
2. Check the displayed information.
3. Apply the displayed discount.

---

# 4. TECHNOLOGY STACK

Use:

* r
* TypeScript
* Tailwind CSS
* Supabase
* Supabase PostgreSQL
* Supabase Auth
* Supabase Storage where required
* Vercel-compatible architecture
* Secure server-side APIs/actions
* Responsive design
* Mobile-first design

Use reusable components and clean architecture.

Do not create unnecessary dependencies.

---

# 5. USER ROLES

Support these roles architecturally:

### CUSTOMER

Normal PennyGrade member.

### SUPER_ADMIN

Full platform control.

### MANAGER

General operational management.

### MEMBERSHIP_MANAGER

Manage members, cards and memberships.

### SUPPORT

Customer/support operations.

The initial implementation may primarily use SUPER_ADMIN, but the database and authorization architecture must support multiple admin roles.

---

# 6. DATABASE ARCHITECTURE

Use Supabase PostgreSQL.

Use UUIDs as internal primary keys.

Do NOT use customer-facing membership numbers as primary keys.

Create the following core tables.

---

## profiles

Fields:

* id
* user_id
* full_name
* mobile
* email
* avatar_url
* created_at
* updated_at

Link user_id to Supabase Auth user.

---

## membership_plans

Fields:

* id
* name
* description
* price
* duration_days
* status
* created_at
* updated_at

Initial plan:

Name:
PennyGrade Annual Membership

Price:
₹500

Duration:
365 days

Keep this database-driven so future membership plans can be added.

---

## memberships

Fields:

* id
* user_id
* plan_id
* membership_number
* start_date
* expiry_date
* status
* created_at
* updated_at

Membership statuses:

* ACTIVE
* SUSPENDED
* CANCELLED
* EXPIRED

Membership number must be unique and randomly generated.

Do NOT use predictable numbers such as:

KRV00001
KRV00002
KRV00003

Instead generate secure random customer-facing IDs such as:

PEN-7X4P-92LM
PEN-Q8F2-K6TZ

Membership numbers are identifiers, not passwords.

---

# 7. PHYSICAL CARD SYSTEM

Physical PennyGrade membership cards are separate from digital memberships.

Create:

## physical_cards

Fields:

* id
* card_number
* membership_id
* status
* issued_at
* created_at
* updated_at

Card statuses:

* AVAILABLE
* ACTIVE
* LOST
* CANCELLED

Important:

A customer membership can exist independently from a physical card.

This allows card replacement without changing the membership.

Example:

Customer loses card.

Admin:

Old card → LOST

New card → assigned to same membership.

---

# 8. CARD GENERATION

Admin should be able to generate batches of unused physical card numbers.

Example:

Generate 500 cards.

System creates:

PEN-7X4P-92LM
PEN-Q8F2-K6TZ
PEN-3M7K-81RX
etc.

Status:

AVAILABLE

Admin should be able to export card numbers for physical printing.

The physical card printer can print the same PennyGrade design with different card numbers.

Do not expose card generation publicly.

---

# 9. CATEGORIES

Create a database-driven category system.

Examples:

* Cafés
* Restaurants
* Hotels
* Salons
* Fitness
* Shopping
* Entertainment
* Travel
* Automobile
* Healthcare
* Education
* Other

Admin can:

* Add category
* Edit category
* Activate/deactivate category
* Reorder category

Do not hard-code categories into the frontend.

---

# 10. PARTNERS

Create:

## partners

Fields:

* id
* business_name
* slug
* category_id
* description
* logo_url
* cover_image_url
* phone
* email
* website
* address
* city
* latitude
* longitude
* business_hours
* status
* featured
* created_at
* updated_at

Statuses:

* ACTIVE
* INACTIVE
* SUSPENDED

Partner slug must be unique.

Example:

ABC Café

slug:

abc-cafe

---

# 11. PARTNER QR SYSTEM

Every active partner receives a permanent QR code.

Example URL:

`https://pennygrade.com/p/abc-cafe`

The QR code identifies the partner.

IMPORTANT:

The QR code must NOT contain the discount value.

If ABC Café changes:

10% → 15%

the same QR code continues working.

The backend retrieves the currently active offer.

Partner QR should therefore be permanent and partner-specific.

Admin should be able to:

* Generate QR
* Preview QR
* Download QR
* Regenerate if required
* View QR status
* Associate QR with partner

Partner QR page:

`/p/[partnerSlug]`

---

# 12. OFFERS

Create:

## offers

Fields:

* id
* partner_id
* title
* description
* discount_type
* discount_value
* max_discount
* minimum_bill
* valid_from
* valid_until
* valid_days
* terms_conditions
* usage_limit_type
* status
* created_at
* updated_at

Discount types:

* PERCENTAGE
* FIXED

Example:

10% off up to ₹500

minimum bill:

₹500

valid days:

Monday–Sunday

usage:

UNLIMITED

The system must support:

* Percentage discounts
* Fixed discounts
* Maximum discount
* Minimum bill
* Valid dates
* Valid weekdays
* Terms and conditions
* Unlimited usage

Keep the rules simple and reliable.

Do NOT build an unnecessarily complicated rule engine.

---

# 13. CUSTOMER AUTHENTICATION

Use Supabase Auth.

Customer registration fields:

* Full name
* Mobile
* Email
* Password

Login:

* Email/password

Structure the authentication layer so additional authentication methods can be added later.

After login, retrieve the user's PennyGrade profile and active membership.

---

# 14. CUSTOMER DOES NOT ENTER MEMBERSHIP ID EVERY TIME

This is extremely important.

The normal flow is:

Customer logs in.

System knows:

Authenticated User
↓
Customer Profile
↓
Active Membership
↓
Membership Number

Therefore the customer should NOT repeatedly enter their membership number.

A membership number fallback can exist if needed, but it must never allow a logged-in customer to access another customer's membership.

Always validate ownership server-side.

---

# 15. CUSTOMER WEBSITE ROUTES

Create these routes:

## Public

`/`

Home page.

`/how-it-works`

Explain how PennyGrade works.

`/partners`

Partner directory.

`/partners/[slug]`

Partner details.

`/offers`

All current offers.

`/login`

Login.

`/register`

Registration.

---

## Authenticated customer

`/account`

Customer dashboard.

`/account/membership`

Membership details.

`/account/profile`

Profile.

`/account/history`

Verification history.

---

## QR

`/p/[partnerSlug]`

Partner QR landing page.

---

## Verification

`/verification/[sessionId]`

Live verification page.

---

# 16. HOMEPAGE

Create a premium homepage.

Hero:

**One Membership. Exclusive Benefits.**

Supporting text:

**Join PennyGrade and unlock exclusive savings at trusted partner businesses across your city and beyond.**

Primary CTA:

**Become a Member**

Secondary CTA:

**Explore Partners**

Hero visual should incorporate the PennyGrade branding/logo.

Sections:

1. Hero
2. How PennyGrade Works
3. Membership Benefits
4. Partner Categories
5. Featured Partners
6. Featured Offers
7. Membership Pricing
8. FAQ
9. Final CTA
10. Footer

---

# 17. HOW IT WORKS

Show a simple 4-step process.

### STEP 1

Get PennyGrade Membership

Join PennyGrade and receive your membership.

### STEP 2

Find a Partner

Explore cafés, restaurants, hotels, salons and other participating businesses.

### STEP 3

Scan & Verify

Scan the PennyGrade QR displayed at the partner location and enter your bill amount.

### STEP 4

Show & Save

Show the live verification screen to staff and enjoy your member discount.

Make this section extremely easy to understand.

---

# 18. PARTNER DIRECTORY

Page:

`/partners`

Features:

* Search
* Category filter
* Featured filter
* Location filter if available
* Offer filter

Partner card should display:

* Logo
* Business name
* Category
* Location
* Main discount
* Short description
* View Offer button

Example:

ABC Café

Café

**10% OFF**

Up to ₹500

[View Offer]

---

# 19. PARTNER DETAILS PAGE

Example:

`/partners/abc-cafe`

Display:

* Cover image
* Logo
* Business name
* Category
* Location
* Description
* Offer
* Discount
* Maximum discount
* Minimum bill
* Valid days
* Terms
* Business hours
* Contact
* Map/location if available

CTA:

**Get Member Discount**

Explain:

"Visit this partner and scan the PennyGrade QR displayed at the counter."

---

# 20. CUSTOMER DASHBOARD

Create a premium dashboard.

Top section:

Welcome, Samir

Membership status:

ACTIVE

Membership ID:

PEN-••••-92LM

Valid until:

31 March 2027

Show:

* Active membership
* Expiry
* Explore partners
* Featured offers
* Categories
* Recent verification activity

Mobile-first layout.

---

# 21. PARTNER QR LANDING FLOW

Customer scans:

ABC Café QR.

Browser opens:

`/p/abc-cafe`

The page immediately identifies:

Partner:
ABC Café

Then checks authentication.

If customer is not logged in:

Show:

**Log in to use your PennyGrade membership**

After successful login, return them to the partner page.

If logged in:

Retrieve active membership.

Do NOT ask for membership ID.

Show:

ABC Café

**10% OFF**

Up to ₹500

Minimum bill ₹500

Then:

### Enter your bill amount

₹ [________]

Button:

**Verify Discount**

---

# 22. DISCOUNT CALCULATION

Discount calculation must happen on the server.

NEVER trust the frontend calculation.

Example:

Bill:

₹2,000

Offer:

10%

Maximum discount:

₹500

Calculated:

₹200

Final amount:

₹1,800

Backend returns:

Bill:
₹2,000

Discount:
₹200

Final payable:
₹1,800

Another example:

Bill:
₹10,000

10%:
₹1,000

Maximum:
₹500

Discount:
₹500

Final:
₹9,500

Minimum bill example:

Minimum bill:
₹500

Customer enters:
₹300

Do not generate verification.

Show:

**This offer requires a minimum bill of ₹500.**

---

# 23. VERIFICATION SESSIONS

Create:

## verification_sessions

Fields:

* id
* user_id
* membership_id
* partner_id
* offer_id
* bill_amount
* discount_amount
* final_amount
* status
* expires_at
* created_at

Statuses:

* ACTIVE
* EXPIRED
* CANCELLED

Verification session should expire after approximately 5 minutes.

IMPORTANT:

This expiration applies only to the verification screen.

It does NOT consume the offer.

If the customer wants another verification, they can generate a new session according to the offer rules.

---

# 24. LIVE VERIFICATION SCREEN

Route:

`/verification/[sessionId]`

This is one of the most important screens.

Make it extremely clear and trustworthy.

Example:

━━━━━━━━━━━━━━━━━━━━

✓ VERIFIED

PENNYGRADE MEMBER BENEFIT

ABC CAFÉ

Membership Verified

Bill Amount

₹2,000

Member Discount

10%

You Save

₹200

CUSTOMER PAYS

₹1,800

━━━━━━━━━━━━━━━━━━━━

LIVE VERIFICATION

Generated:
6:42 PM

Valid until:
6:47 PM

Show this screen to the staff.

━━━━━━━━━━━━━━━━━━━━

Include:

* Large verification status
* Partner name
* Discount
* Bill amount
* Savings
* Final payable
* Timestamp
* Expiration countdown
* LIVE VERIFICATION indicator

Make the screen optimized for mobile.

The customer will likely hold the phone in front of staff.

Use high contrast and extremely readable typography.

---

# 25. VERIFICATION LOGGING

Create:

## verification_logs

Fields:

* id
* verification_session_id
* user_id
* membership_id
* partner_id
* offer_id
* bill_amount
* discount_amount
* final_amount
* status
* created_at

Record every successful verification.

This is for:

* Analytics
* Auditing
* Partner performance
* Member activity
* Business insights

Do not treat this as a one-time redemption system.

---

# 26. ADMIN DASHBOARD

Create a professional admin dashboard.

Sidebar:

Dashboard

Members

Physical Cards

Membership Plans

Categories

Partners

Offers

QR Codes

Verification Logs

Reports

Admins

Audit Logs

Settings

---

# 27. ADMIN DASHBOARD OVERVIEW

Show cards:

Total Members

Active Members

Expired Members

Active Partners

Active Offers

Today's Verifications

Monthly Verifications

Estimated Discount Value

Charts:

* Membership growth
* Verification activity
* Partner performance
* Category performance

Use clean charts.

Avoid excessive visual clutter.

---

# 28. ADMIN MEMBER MANAGEMENT

Page:

`/admin/members`

Features:

* Search
* Filter
* Sort
* Pagination
* Create member
* Edit member
* View member
* Suspend
* Activate
* Cancel
* Renew
* Replace card

Member table:

Name

Mobile

Email

Membership ID

Plan

Start Date

Expiry

Status

Card

Actions

---

# 29. MEMBER CREATION

Admin can create a member.

Fields:

Full name

Mobile

Email

Plan

Start date

Expiry date

Assign physical card

System generates membership number securely.

Example:

PEN-7X4P-92LM

Do not allow duplicate membership numbers.

---

# 30. CARD MANAGEMENT

Admin page:

`/admin/cards`

Show:

Card Number

Status

Assigned Member

Created

Issued

Actions

Filters:

AVAILABLE

ACTIVE

LOST

CANCELLED

Actions:

Generate cards

Assign card

Replace card

Mark lost

Cancel card

Export CSV

---

# 31. BULK CARD GENERATION

Admin can select:

Generate 100

Generate 500

Generate 1000

etc.

System generates secure random unique card numbers.

Example format:

PEN-XXXX-XXXX

Use cryptographically secure random generation.

Never use sequential predictable IDs.

---

# 32. CATEGORIES ADMIN

Admin can:

Add category

Edit

Activate/deactivate

Reorder

Show category icon/image if supported.

Categories must be database-driven.

---

# 33. PARTNER ADMIN

Page:

`/admin/partners`

Features:

Add partner

Edit partner

Deactivate

Suspend

Feature/unfeature

View offers

Generate QR

Fields:

Business name

Category

Description

Logo

Cover

Phone

Email

Website

Address

City

Map location

Business hours

Status

---

# 34. OFFER ADMIN

Admin should be able to create offers for each partner.

Example form:

Partner:
ABC Café

Offer title:
10% Off

Discount type:
Percentage

Discount:
10%

Maximum discount:
₹500

Minimum bill:
₹500

Valid from:
01/01/2027

Valid until:
31/12/2027

Valid days:

Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday

Usage:

Unlimited

Terms:

"Valid on dine-in bills only. Cannot be combined with other offers."

Make this easy to configure.

---

# 35. QR ADMIN

Page:

`/admin/qr-codes`

Show:

Partner

QR status

QR URL

Created date

Actions:

Preview

Download

Regenerate

Print

QR must always point to the partner slug route.

Example:

`/p/abc-cafe`

---

# 36. VERIFICATION LOGS ADMIN

Page:

`/admin/verifications`

Filters:

Date

Member

Partner

Category

Offer

Status

Display:

Member

Partner

Bill

Discount

Final amount

Date/time

Verification ID

Do not expose unnecessary sensitive information.

---

# 37. REPORTS

Create reporting pages.

Reports:

Partner performance

Category performance

Member activity

Verification volume

Estimated discount value

Most-used partners

Most-active members

Monthly trends

Use clean charts and tables.

---

# 38. ADMIN AUDIT LOGS

Create:

## audit_logs

Fields:

* id
* admin_user_id
* action
* target_type
* target_id
* metadata
* created_at

Log important actions such as:

* Created partner
* Changed offer
* Suspended membership
* Renewed membership
* Replaced card
* Changed discount
* Deleted/deactivated partner

---

# 39. SECURITY

Security is extremely important.

Implement:

Supabase Auth

Supabase Row Level Security

Role-based authorization

Server-side validation

Server-side discount calculation

Secure membership ID generation

Rate limiting where possible

Input validation

HTTPS

No service-role key in frontend

Do not trust:

* URL parameters
* hidden fields
* localStorage
* frontend discount calculations
* client-side membership status

All sensitive decisions must happen server-side.

---

# 40. MEMBERSHIP ID SECURITY

Membership IDs must be random.

Do not expose sequential IDs.

Do not reveal whether a guessed membership ID exists.

Generic error:

**Unable to verify membership.**

Do NOT return:

"Membership ID does not exist."

"Membership expired."

"Membership belongs to another user."

This prevents enumeration attacks.

---

# 41. MEMBERSHIP ID FALLBACK

If a membership ID fallback is implemented:

Customer enters:

PEN-7X4P-92LM

Backend must check:

Authenticated user
↓
Membership
↓
Membership ownership

A user must never be able to access another customer's membership simply by guessing their ID.

---

# 42. ACCESS CONTROL

Customer can only access:

* Their own profile
* Their own membership
* Their own verification sessions
* Their own verification history

Customer cannot:

* Access another member
* Change membership status
* Change discount
* Change partner
* Change offer
* Access admin pages

Admin access must be separately protected.

---

# 43. EDGE CASES

Handle:

Expired membership

Suspended membership

Cancelled membership

Lost card

Inactive partner

Suspended partner

Inactive offer

Expired offer

Offer not yet active

Minimum bill not reached

Maximum discount reached

Invalid bill

Negative bill

Extremely large bill

Invalid QR

Invalid partner slug

Expired verification

Unauthorized verification access

Multiple uses of unlimited offer

Wrong user membership

Rate-limit repeated failures

---

# 44. CUSTOMER ERROR MESSAGES

Use friendly messages.

Expired membership:

**Your PennyGrade membership has expired. Please contact PennyGrade support to renew it.**

Inactive offer:

**This offer is currently unavailable.**

Minimum bill:

**This offer requires a minimum bill of ₹500.**

Invalid partner:

**This PennyGrade partner could not be found.**

Verification expired:

**This verification has expired. Please generate a new verification.**

Generic verification error:

**Unable to verify membership. Please try again.**

---

# 45. CUSTOMER ACCOUNT

Profile page should include:

Full name

Email

Mobile

Membership

Membership ID

Membership status

Expiry

Current card

Verification history

Keep the design simple.

---

# 46. VERIFICATION HISTORY

Customer can view previous verification sessions.

Example:

ABC Café
₹2,000
Saved ₹200
Today, 6:42 PM

XYZ Salon
₹1,500
Saved ₹300
Yesterday

Use cards on mobile.

---

# 47. RESPONSIVE DESIGN

The entire application must be fully responsive.

Prioritize:

Mobile

Tablet

Desktop

The QR → bill → verification flow must be especially optimized for mobile.

Admin dashboard should work well on desktop and tablet.

Do not simply shrink desktop UI on mobile.

Create proper responsive layouts.

---

# 48. DESIGN SYSTEM

Use the PennyGrade logo as the primary visual reference.

Build:

* Consistent typography
* Consistent spacing
* Consistent border radius
* Consistent button styles
* Consistent cards
* Consistent form fields
* Consistent status badges

Use subtle shadows.

Use whitespace.

Avoid:

* Excessive gradients
* Excessive animations
* Neon colors
* Overly rounded childish UI
* Visual clutter
* Huge unnecessary illustrations

Animations should be subtle and purposeful.

---

# 49. NAVIGATION

Customer navbar:

PennyGrade logo

Home

Partners

Offers

How It Works

Login / Account

Mobile menu

Authenticated customer:

Home

Partners

Offers

My Membership

History

Profile

---

# 50. FOOTER

Footer:

PennyGrade logo

Short description

Quick Links

Partners

How It Works

Membership

Contact

Terms & Conditions

Privacy Policy

FAQ

Copyright

---

# 51. MEMBERSHIP PRICING SECTION

Display:

## PennyGrade Membership

₹500 / year

Benefits:

✓ Exclusive partner discounts

✓ Access to participating businesses

✓ Digital membership verification

✓ Unlimited eligible offer usage

✓ Growing partner network

CTA:

**Become a Member**

Remember:

V1 has NO online payment gateway.

The membership can be activated manually by admin.

Do not create fake payment functionality.

---

# 52. NO PAYMENT INTEGRATION IN V1

Do not integrate:

Razorpay

Stripe

PayPal

Any payment gateway

Membership activation is admin-controlled in V1.

Architecture should allow payment integration later.

---

# 53. NO WHATSAPP IN V1

Do not add:

WhatsApp verification

WhatsApp OTP

WhatsApp redemption

WhatsApp partner communication

---

# 54. NO POS INTEGRATION

Do not integrate:

Billing software

POS systems

Restaurant POS

Hotel PMS

Salon software

etc.

The partner simply applies the displayed discount manually.

---

# 55. NO PARTNER TRANSACTION DASHBOARD

Do not force partners to:

Login

Scan customer

Enter membership number

Enter bill

Approve discount

Confirm transaction

Use mobile app

Use dashboard for each transaction

The customer generates the verification.

---

# 56. PARTNER AGREEMENT PRINCIPLE

The platform cannot physically force a business to honor a discount.

The PennyGrade partner agreement should require partners to honor valid member benefits.

The live verification screen should clearly establish:

Verified Member

Verified Partner

Bill Amount

Discount

Final Payable

Timestamp

Expiry

---

# 57. ANTI-FRAUD APPROACH

Use a temporary live verification session.

Approximately 5-minute validity.

Display:

LIVE VERIFICATION

with timestamp/countdown.

The goal is to prevent customers from relying on old screenshots.

Do not implement complex staff-side verification in V1.

A stronger staff verification system can be added later if required.

---

# 58. IMPORTANT: UNLIMITED USAGE

Offers are unlimited by default.

Do NOT build a one-time redemption system.

Verification session expiration ≠ offer redemption.

A customer can use an unlimited offer multiple times.

Example:

ABC Café:

10% off

Unlimited usage

Customer visits Monday → uses discount.

Customer visits Wednesday → uses discount again.

Customer visits Friday → uses discount again.

All are valid according to the offer rules.

---

# 59. DATABASE RELATIONSHIPS

Implement:

Supabase Auth Users
↓
Profiles

Profiles
↓
Memberships

Memberships
↓
Physical Cards

Membership Plans
↓
Memberships

Categories
↓
Partners

Partners
↓
Offers

Users/Memberships
↓
Verification Sessions

Partners
↓
Verification Sessions

Offers
↓
Verification Sessions

Admin Users
↓
Audit Logs

Use proper foreign keys and indexes.

---

# 60. INDEXES

Add indexes where appropriate:

membership_number

user_id

partner.slug

partner.category_id

offer.partner_id

offer.status

verification_sessions.user_id

verification_sessions.partner_id

verification_sessions.created_at

verification_logs.partner_id

verification_logs.created_at

---

# 61. RLS

Implement proper Supabase Row Level Security.

Customers:

Can read/update their own profile.

Can read their own memberships.

Can read their own verification history.

Can create verification requests through secure server-side logic.

Cannot modify discount calculations.

Cannot modify membership status.

Cannot access admin data.

Admin:

Access according to admin role.

Partner/public data:

Only active partners and active offers should be publicly visible.

---

# 62. ADMIN AUTH

Protect all:

`/admin/*`

routes.

Unauthenticated users must be redirected to admin login.

Normal customers must not access admin pages.

Do not rely only on frontend route protection.

Also enforce authorization server-side.

---

# 63. SEO

Public pages should be SEO-friendly.

Add:

Proper metadata

Title

Description

Open Graph metadata

Semantic HTML

Clean URLs

Sitemap

Robots

Partner-specific metadata

Example:

PennyGrade | Exclusive Membership Benefits

Partner pages should have appropriate metadata.

---

# 64. PERFORMANCE

Optimize:

Images

Next.js images

Lazy loading

Database queries

Caching where appropriate

Avoid unnecessary client-side JavaScript.

The customer QR flow must load quickly.

---

# 65. EMPTY STATES

Create polished empty states.

No partners:

"No partner businesses are available yet."

No offers:

"No active offers available right now."

No verification history:

"Your verification activity will appear here."

No membership:

"You don't currently have an active PennyGrade membership."

---

# 66. LOADING STATES

Create skeleton loaders for:

Partner cards

Partner pages

Dashboard

Offers

Admin tables

Verification.

Do not show blank white screens.

---

# 67. TOASTS / NOTIFICATIONS

Use clean toast messages for:

Successful membership assignment

Card assignment

Partner creation

Offer creation

QR generation

Verification creation

Profile updates

Errors

Do not overuse notifications.

---

# 68. MAIN CUSTOMER FLOW — FINAL

Implement this exact flow:

Customer logs in.

↓

Customer visits ABC Café.

↓

ABC Café has permanent PennyGrade QR.

↓

Customer scans QR.

↓

`/p/abc-cafe`

↓

System identifies ABC Café.

↓

System checks logged-in customer.

↓

System retrieves active PennyGrade membership.

↓

System retrieves ABC Café's active offer.

↓

Customer sees:

ABC Café

10% OFF

Up to ₹500

Minimum bill ₹500

↓

Customer enters:

₹2,000

↓

Backend validates:

User authenticated

Membership exists

Membership belongs to user

Membership active

Partner active

Offer active

Offer valid

Minimum bill satisfied

↓

Backend calculates:

10% of ₹2,000 = ₹200

Maximum = ₹500

Discount = ₹200

Final = ₹1,800

↓

Create verification session.

↓

Show:

✓ VERIFIED

ABC CAFÉ

Bill ₹2,000

Discount ₹200

You Save ₹200

CUSTOMER PAYS ₹1,800

LIVE VERIFICATION

Valid for approximately 5 minutes.

↓

Customer shows phone to staff.

↓

Staff applies ₹200 discount.

↓

Done.

No staff login.

No staff scan.

No membership ID entry.

No WhatsApp.

No POS.

No app.

---

# 69. ADMIN FLOW — FINAL

Admin logs in.

↓

Dashboard.

↓

Generate physical card batch.

↓

Example:

500 available card numbers.

↓

Print physical cards.

↓

Customer purchases/receives membership offline.

↓

Admin creates customer account/membership.

↓

Admin assigns available physical card.

↓

Membership becomes ACTIVE.

↓

Customer receives physical PennyGrade card.

↓

Customer logs into website.

↓

Customer can browse partners.

↓

Customer can use discounts.

---

# 70. PHYSICAL CARD UI

Create an admin card preview.

Front:

PennyGrade logo

PREMIUM MEMBERSHIP

Customer Name

Membership ID

Valid Until

Back:

PennyGrade

"Present your membership when required."

Website

Support/contact

Terms

Do not add sensitive information.

Do not add payment-card information.

---

# 71. FUTURE-READY ARCHITECTURE

Do not implement these in V1, but structure code so they can be added later:

* Online membership payment
* Partner dashboard
* Staff verification
* POS integration
* WhatsApp integration
* Mobile app
* Advanced redemption system
* Membership QR
* Digital wallet
* Loyalty points
* Referral system
* Subscription renewal
* Multiple membership plans
* Coupons
* Geographic partner discovery

Do not build these now.

---

# 72. IMPORTANT PRODUCT RULES

These rules must not be violated:

1. Customer scans partner QR.
2. Partner QR identifies partner.
3. Customer is authenticated.
4. Customer membership is automatically identified.
5. Customer enters bill amount.
6. Backend calculates discount.
7. Temporary verification screen is generated.
8. Customer shows screen to staff.
9. Staff applies discount manually.
10. No partner transaction dashboard.
11. No staff scanning.
12. No staff membership entry.
13. No WhatsApp.
14. No POS.
15. No payment gateway in V1.
16. Unlimited offers remain reusable.
17. Verification sessions expire after approximately 5 minutes.
18. Physical card and digital membership are separate entities.
19. Membership IDs are random and non-predictable.
20. Security validation happens server-side.

---

# 73. SEED / DEMO DATA

Create realistic demo data for development.

Example categories:

Cafés
Restaurants
Hotels
Salons
Fitness
Shopping

Example partners:

ABC Café

Urban Brew

The Grand Stay

Glow Salon

FitZone

Example offers:

ABC Café:
10% OFF
Max ₹500
Min bill ₹500
Unlimited

Urban Brew:
15% OFF
Max ₹300
Min bill ₹300
Unlimited

Use placeholder images only where necessary.

Clearly structure seed/demo data so it can be removed.

---

# 74. UI QUALITY BAR

The application should look like a real startup product, not a generic admin template.

Think:

Premium membership platform

Modern fintech-inspired interface

Lifestyle benefits marketplace

Strong visual hierarchy

Excellent mobile UX

Professional typography

Trustworthy verification UI

The verification screen is particularly important.

It should look credible when shown to a business employee.

---

# 75. IMPLEMENTATION APPROACH

Build the project in a structured manner.

First create:

1. Database schema
2. Authentication
3. RLS
4. Admin authorization
5. Admin dashboard
6. Membership/card system
7. Categories
8. Partners
9. Offers
10. Partner QR
11. Customer pages
12. QR flow
13. Discount calculation
14. Verification sessions
15. Live verification screen
16. Verification logs
17. Reports
18. Security hardening
19. Responsive optimization
20. SEO

Use reusable components.

Keep business logic separate from UI.

Use server-side functions/actions for sensitive operations.

Do not put secret keys into frontend code.

---

# 76. FINAL REQUEST TO LOVABLE

Build the complete PennyGrade application according to this specification.

Before implementing any feature, preserve the core business flow described above.

Do not simplify away the membership/card relationship.

Do not turn the system into a generic coupon website.

Do not introduce partner-side transaction workflows.

Do not introduce unnecessary payment, WhatsApp, POS, app, or redemption functionality.

Use the attached PennyGrade logo as the official brand asset.

The final product should feel like a polished, production-ready membership benefits platform that can be presented to real customers, partner businesses, and the PennyGrade owner.

Prioritize:

**Security → Correct business logic → Mobile UX → Admin usability → Visual polish → Performance.**

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/08fa7757-ff54-4e57-b545-b6d43ec74734).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
