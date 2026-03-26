# PRD — StoreOS Navigation Restructure & Reports Module
## Phase 4.2: Nav Overhaul, Sales Log Improvements & Reports Page
**Version:** 1.0
**Priority:** HIGH
**Status:** Ready for Implementation

---

## 1. Objective

Eliminate redundancy across Sales, Statements, and History by consolidating into a clear 5-tab structure. Build a proper Reports page that serves as the financial overview. Fix the WhatsApp share bug and sales log date grouping.

---

## 2. New Navigation Structure

### 2.1 Bottom Nav (Mobile) — 5 Tabs

| Position | Label | Icon | Route |
|---|---|---|---|
| 1 | Home | grid | /dashboard |
| 2 | Inventory | box | /dashboard/inventory |
| 3 | Sales | cart | /dashboard/sales |
| 4 | Reports | chart-bar | /dashboard/reports |
| 5 | More | ellipsis | opens bottom sheet |

### 2.2 More Bottom Sheet Contents

| Item | Icon | Route |
|---|---|---|
| Credit | users | /dashboard/credit |
| Finance Portal | landmark | /dashboard/finance |
| Settings | settings | /dashboard/settings |

### 2.3 Desktop Sidebar — Updated Order
1. Dashboard
2. Inventory
3. Sales
4. Reports
5. Credit
6. Finance
7. Settings

### 2.4 Pages to Remove / Redirect
- `/dashboard/statements` → redirect to `/dashboard/reports`
- `/dashboard/history` → redirect to `/dashboard/reports`
- Delete the old Statements page component entirely
- All links or buttons pointing to "Statements" anywhere in the app → update to point to `/dashboard/reports`

---

## 3. Sales Page Improvements

### 3.1 Date Grouping
The sales log currently shows transactions with times but no date separators. Group all sales by date with a sticky section header:

```
─────────────────────────────────
  Today, 25 March 2026          ₦41,600
─────────────────────────────────
  11:32   3 items      ₦4,550   Cash →
  14:02   Digestive Biscuits  ₦16,000  Cash →
  14:01   Digestive Biscuits  ₦10,000  Cash →

─────────────────────────────────
  Yesterday, 24 March 2026      ₦31,050
─────────────────────────────────
  12:12   3 items      ₦5,050   Cash →
  20:18   Milk         ₦6,000   Cash →
```

- Section header shows: date label (Today / Yesterday / full date) + total revenue for that day on the right
- Section header is muted/secondary weight — not competing with the transaction rows
- Most recent date always at the top

### 3.2 Sale Row Tap → Receipt Modal
Already spec'd in Phase 4 PRD. Confirm it is implemented:
- Tapping any sale row opens a receipt bottom sheet
- Shows: all items sold, quantities, unit types, total, payment method, customer name if credit
- Actions: Share via WhatsApp, Void Sale (owner only), Close

### 3.3 WhatsApp Share Fix
**Current bug:** Tapping WhatsApp share navigates the current tab to WhatsApp URL, leaving a blank page when the user returns.

**Fix — apply everywhere WhatsApp share is used (sales receipt + reports):**
```ts
async function shareViaWhatsApp(text: string) {
  if (navigator.share) {
    // Native share sheet — no navigation, no blank page
    try {
      await navigator.share({ text })
      return
    } catch (err) {
      // User cancelled or share failed — fall through to WhatsApp link
    }
  }
  // Fallback: open in NEW tab — never navigate current tab
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer'
  )
}
```

Use `navigator.share` first — on Android this opens the native share sheet (cleaner). Only fall back to the WhatsApp deep link if `navigator.share` is unavailable (desktop) or cancelled. Always `_blank` on the fallback — never `window.location.href`.

---

## 4. Reports Page (New — replaces Statements)

### 4.1 Overview
Route: `/dashboard/reports`

The Reports page is the financial intelligence layer of StoreOS. It answers: "How is my business doing?" at a weekly, monthly, and all-time level. It is distinct from the Sales page (which is operational — "what did I sell today?") and serves as the formal record and export hub.

### 4.2 Page Structure

**Header:**
```
Reports                          [Daily ▾]
Financial overview & statements
```
The [Daily ▾] is a period selector dropdown: Daily / Weekly / Monthly / All Time

---

**Section 1 — Summary Cards (updates based on selected period)**

Four metric cards in a 2×2 grid:
- Total Revenue
- Total Transactions
- Cash + Transfer (combined)
- Credit Extended

Below the cards, a horizontal bar or simple chart showing revenue trend for the selected period (7 bars for weekly, 30 for monthly, etc.)

For the chart use a simple bar chart — no library needed, can be built with CSS flexbox bars or a lightweight canvas implementation.

---

**Section 2 — Period Breakdown (below summary)**

When period = **Monthly** (default view):

```
March 2026                    ₦182,500   [← →]
──────────────────────────────────────
  Week 1  (1–7 Mar)           ₦42,000   →
  Week 2  (8–14 Mar)          ₦55,500   →
  Week 3  (15–21 Mar)         ₦48,000   →
  Week 4  (22–28 Mar)         ₦37,000   →
```

Tapping a week row expands it to show daily breakdown:
```
  Week 1  (1–7 Mar)           ₦42,000   ↑
  ────────────────────────────────
    Mon 1 Mar                  ₦8,200
    Tue 2 Mar                  ₦12,400
    Wed 3 Mar                  ₦5,900
    ...
```

Tapping a day row → opens a day detail modal showing:
- All sales from that day (same receipt-style list as Sales page)
- Day totals (cash, transfer, credit)
- Download CSV button for that day
- Share via WhatsApp button

When period = **Daily**:
- Shows the last 30 days listed individually with revenue per day
- Each day tappable → opens day detail modal

When period = **All Time**:
- Shows each month listed with total revenue
- Each month tappable → drills down to weekly/daily view

---

**Section 3 — Export & Statements**

Below the breakdown, a dedicated export section:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Export & Statements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Download this month's CSV]
  [Download custom range CSV]   ← date picker: from / to
  [Share summary via WhatsApp]
```

This replaces the old Statements page cards entirely. The export lives here, inside Reports.

**Custom range CSV:** Two date pickers (From / To), then a Download button. Generates a CSV covering all sales in that range using the same format defined in Phase 4 PRD.

---

**Section 4 — Top Products (monthly view only)**

A simple ranked list:
```
  Top Products — March 2026
  ─────────────────────────
  1. Digestive Biscuits      ₦26,000   16 sold
  2. Milo 500g               ₦22,500   9 sold
  3. Eva Water 75cl          ₦15,000   60 sold
```

Calculated from the `items` JSONB array in the sales table — group by product_id, sum quantities and revenue.

---

### 4.3 Data Sources
All data read from Dexie (offline-first):

```ts
// Get all sales for a date range
const sales = await db.sales
  .where('business_id').equals(businessId)
  .and(sale => {
    const date = new Date(sale.created_at)
    return date >= startDate && date <= endDate
  })
  .filter(sale => !sale.voided)
  .toArray()
```

Aggregate in the component:
- Revenue = sum of `sale.total` where `payment_type !== 'credit'`... actually sum ALL totals for revenue, then break down by payment type separately
- Top products = flatten all `sale.items` arrays, group by `product_id`, sum quantities and totals

### 4.4 Empty State
If no sales data exists for the selected period:
```
  [chart icon]
  No sales data for this period
  Head to Sales to record transactions
  [Record a Sale →]
```

---

## 5. Implementation Order

1. Update bottom nav — replace Credit with Reports tab, update More sheet to include Credit (Section 2.1–2.2)
2. Update desktop sidebar order (Section 2.3)
3. Add redirect from `/dashboard/statements` → `/dashboard/reports` (Section 2.4)
4. Add date group headers to Sales log (Section 3.1)
5. Fix WhatsApp share function — apply everywhere it's used (Section 3.3)
6. Build `/dashboard/reports` page — summary cards + period selector (Section 4.2)
7. Build weekly/daily breakdown with expand/collapse (Section 4.2 Section 2)
8. Build day detail modal (tapping a day) (Section 4.2 Section 2)
9. Build export section with custom date range (Section 4.2 Section 3)
10. Build top products list (Section 4.2 Section 4)
11. Delete old Statements page component

---

## 6. Definition of Done

- [ ] Bottom nav shows: Home, Inventory, Sales, Reports, More
- [ ] More sheet contains: Credit, Finance Portal, Settings
- [ ] Sales log groups transactions under date headers with daily totals
- [ ] Tapping a sale opens receipt modal
- [ ] WhatsApp share no longer causes a blank page on return — uses navigator.share with _blank fallback
- [ ] `/dashboard/reports` loads with summary cards and period selector
- [ ] Monthly view shows weekly breakdown, tapping a week shows daily breakdown
- [ ] Tapping a day shows all sales from that day with export options
- [ ] Custom date range CSV export works correctly
- [ ] Top products list renders correctly from sales items data
- [ ] Old `/dashboard/statements` route redirects to `/dashboard/reports`

---

*Feed to Cursor. Follow implementation order exactly — nav changes first, then Sales fixes, then build Reports page top to bottom.*
