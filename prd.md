# Product Requirements Document (PRD)
## StoreOS — Business Management Platform for SME Supermarkets
**Version:** 1.0 (Generic / Portfolio Build)
**Prepared by:** University Tech Hub
**Status:** Draft

---

## 1. Product Overview

### 1.1 Summary
StoreOS is a web-based, offline-capable business management platform designed for small and medium-sized supermarkets and provision stores. It replaces the biro-and-book method of recording sales, inventory, and credit with a clean, fast, and intelligent digital system.

The platform targets Nigerian SME retail owners — businesses that generate significant daily revenue but operate with zero financial infrastructure. StoreOS gives them operational clarity today and financial identity tomorrow.

### 1.2 Problem Statement
Local supermarkets and provision stores in Nigeria:
- Record sales, inventory, and credit manually using notebooks
- Have no formal financial records, making them ineligible for loans or grants
- Cannot track stock levels, leading to unnoticed stockouts and wastage
- Extend credit informally with no reliable tracking system
- Have no visibility into daily, weekly, or monthly business performance

### 1.3 Vision
To be the operating system for every informal retail business — turning daily transactions into financial power.

### 1.4 Goals for v1 (Generic Portfolio Build)
- Demonstrate a production-quality, fully functional platform
- Cover the core modules any supermarket owner would immediately recognise as valuable
- Serve as a customisable base that can be tailored to specific clients after onboarding
- Be demoable to a non-technical business owner within 5 minutes

---

## 2. Target Users

### Primary User — The Store Owner / Manager
- Age: 28–55
- Device: Smartphone (primary), laptop (secondary)
- Technical comfort: Low to moderate — uses WhatsApp, makes transfers on mobile banking
- Pain: Losing track of stock, chasing debtors, not knowing if the business is actually profitable
- Goal: Spend less time on paperwork, know their numbers, access funding

### Secondary User — Store Staff / Cashier
- Records sales during the day
- Should not have access to financial reports or credit management
- Needs a fast, simple interface to log transactions

---

## 3. Core Modules

### Module 1 — Dashboard
The first screen after login. Gives the owner a live pulse of their business.

**Features:**
- Daily revenue counter (updates with each sale)
- Total sales count for the day
- Low stock alerts (items below threshold)
- Outstanding credit summary (total owed to store)
- Quick action buttons: Record Sale, Add Stock, View Statement
- Date selector to view past days

**Design note:** Card-based layout. Clean, bold numbers. Think mobile banking dashboard energy — data should feel alive, not like a spreadsheet.

---

### Module 2 — Inventory Management
Track every product in the store — what's available, what's running low, what needs restocking.

**Features:**
- Add products (name, category, buying price, selling price, quantity, low-stock threshold)
- Edit and delete products
- Search and filter by category
- Low-stock indicator (visual highlight when quantity falls below threshold)
- Restock log — record when new stock arrives and from which supplier
- Export inventory list

**Offline behaviour:** All inventory reads and writes happen locally via IndexedDB. Syncs to Supabase when online.

---

### Module 3 — Sales Recording (POS-lite)
Replace the sales notebook with a fast, clean transaction logger.

**Features:**
- Select product(s) from inventory
- Input quantity sold
- System calculates total automatically
- Payment method: Cash / Transfer / Credit
- If Credit — link to a customer record
- Receipt generation (printable / shareable via WhatsApp)
- Each sale automatically deducts from inventory
- View sales log (filterable by date, product, staff)

**Design note:** The sales entry screen should be fast — a store owner should be able to log a sale in under 15 seconds.

---

### Module 4 — Credit & Debt Tracker
Track customers who buy on credit — the most emotionally loaded problem for any store owner.

**Features:**
- Add customer (name, phone number)
- Log credit transaction against a customer (auto-linked from sales module)
- Record repayments
- View each customer's full credit history
- Outstanding balance shown prominently
- Send payment reminder via WhatsApp (pre-filled message)
- Overdue flag for credit older than a set number of days

---

### Module 5 — Automated Statement Generation ⭐ Killer Feature
At the end of each day or month, the system automatically compiles all recorded activity into a clean, formal Statement of Account — no manual work required.

**Features:**
- Daily Statement: auto-generated at end of day or on demand
  - Total sales, total cash received, total credit extended, total repayments, closing stock value
- Monthly Statement: compiled from daily records
  - Revenue trend, top-selling products, credit summary, net position
- Statement format: Formal, branded PDF — looks like a bank statement
- Statements are stored and retrievable by date
- Download as PDF or share directly

**Design note:** The statement must look credible enough to hand to a bank or grant officer. Professional typography, business name/logo, date range, itemised figures, totals. This is what makes the platform more than a notebook replacement.

---

### Module 6 — Financial Assistance Portal ⭐ Differentiator
Uses the generated statements to help store owners apply for loans or grants — handling the paperwork they usually avoid or don't know how to complete.

**Features:**
- Portal lists available loan/grant options (curated — e.g., CBN schemes, state government grants, fintech lenders like FairMoney, Moniepoint)
- Each listing shows: eligibility criteria, required documents, amount range, repayment terms
- One-click application assistant:
  - System pre-fills application form using stored business data and generated statements
  - Owner reviews and confirms
  - Application package (filled form + statement PDF) is ready to submit or download
- Application tracker: status of submitted applications
- Eligibility checker: based on business data, suggest which schemes the store likely qualifies for

**v1 scope note:** For the portfolio/generic build, loan listings can be static/curated data. Dynamic API integration with lenders is a v2 feature.

---

### Module 7 — Settings & Business Profile
- Business name, logo, address, contact
- Staff accounts with role-based access (Owner / Cashier)
- Currency and tax settings
- Low-stock threshold defaults
- Notification preferences

---

## 4. Onboarding User Flow

### Step 1 — Sign Up
- User lands on marketing page → clicks "Get Started Free"
- Inputs: Business email + password OR phone number (OTP)
- No lengthy forms at this stage

### Step 2 — Business Profile Setup
A friendly, one-field-at-a-time or single-screen form:
1. Business name
2. Business type (pre-selected: Supermarket / Provision Store / General Store)
3. Location / address
4. Business phone number
5. Upload logo (optional)

Progress bar visible. Max 5 fields. Completable in under 2 minutes.

### Step 3 — Inventory Kickstart
Rather than dropping the user into an empty dashboard:
- Three clear paths presented:
  - "Add your first product" → quick-add modal
  - "Import from Excel" → CSV upload
  - "Skip, I'll do this later" → go to dashboard
- Adding even one product activates the dashboard and makes it feel alive

### Step 4 — Guided Dashboard Tour
4-step tooltip walkthrough (skippable at any time):
1. "Here's your live business summary"
2. "This is where your sales are recorded"
3. "Track who owes you money here"
4. "Your statement is auto-generated here every day"

### Step 5 — First Sale Prompt
A subtle nudge card on the dashboard: "Record your first sale to get started →"
Once the first sale is recorded, the dashboard updates live — this is the moment the product clicks.

---

## 5. Design Direction

### Philosophy
- **Feels like a bank app, not a school project.** Clean, confident, trustworthy.
- **Data is the hero.** Numbers should be large, readable, and satisfying to look at.
- **Built for a phone first.** Even as a web app, all screens should work perfectly on a mobile browser.

### Visual Language
- **Font:** Inter or Plus Jakarta Sans — modern, legible, professional
- **Colours:** Deep green as primary (connotes money, growth, trust) with white backgrounds and subtle grey cards
- **Icons:** Lucide or Phosphor icons — clean and consistent
- **Spacing:** Generous padding. Nothing crammed.
- **Tone:** Friendly but professional. Nigerian SMEs respond to clarity and confidence.

### Key Screens to Design (for demo)
1. Landing / marketing page
2. Onboarding flow (3–4 screens)
3. Dashboard (main home screen)
4. Sales recording screen
5. Inventory list + add product
6. Credit tracker
7. Statement preview (PDF-like view)
8. Financial portal home

---

## 6. Technical Architecture

### Stack
| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js (React) | PWA support, fast, great ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Clean UI fast |
| Offline / Local DB | IndexedDB via Dexie.js | Reliable offline-first data layer |
| Backend / Database | Supabase | Postgres + Auth + Realtime, generous free tier |
| Background Sync | Service Workers + Workbox | Handles offline→online sync |
| Statement Generation | React-PDF / pdf-lib | In-browser PDF generation |
| Hosting | Vercel | Free tier, GitHub deploys, fast CDN |

### Offline Strategy
- All writes go to IndexedDB first
- Service worker queues sync operations
- On reconnection, local changes push to Supabase
- Conflict resolution: last-write-wins for v1
- Offline indicator shown in UI when no connection detected

### Auth
- Supabase Auth (email/password + phone OTP)
- Row-Level Security on all Supabase tables (owner only sees their data)
- Role-based access: Owner (full access) / Staff (sales recording only)

### Data Models (simplified)
- `businesses` — id, name, type, address, logo_url, owner_id
- `products` — id, business_id, name, category, buy_price, sell_price, quantity, threshold
- `sales` — id, business_id, product_id, quantity, total, payment_type, customer_id, created_at
- `customers` — id, business_id, name, phone
- `credit_transactions` — id, business_id, customer_id, amount, type (debit/repayment), created_at
- `statements` — id, business_id, date, type (daily/monthly), data_json, pdf_url

---

## 7. Out of Scope for v1

- Native mobile app (iOS / Android)
- Real-time lender API integrations
- Multi-branch / multi-location support
- Customer-facing ordering / e-commerce
- Barcode / QR scanning
- Payroll management
- Automated WhatsApp bot integration
- Advanced accounting (double-entry bookkeeping)

These are deliberately deferred — v1 must be fast to build, impressive to demo, and solid in its core loop.

---

## 8. Success Metrics (for demo / pilot)

- A store owner can onboard and record their first sale in under 5 minutes
- A daily statement generates correctly from recorded sales
- The app is fully usable with no internet connection
- A non-technical observer watching a demo says "I understand what this does"

---

## 9. Open Questions

- What is the app name? (StoreOS is a placeholder)
- Will the financial portal link to real lenders in v1, or use curated static data?
- Who handles customer support when a real client is onboarded?
- Is there a pricing/monetisation model for when the hub takes on paying clients?

---

*Document version 1.0 — to be updated after client discovery sessions and survey findings.*