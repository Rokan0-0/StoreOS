# PRD — StoreOS Improvements & Standards Update
## Phase 4: UX Polish, Inventory Overhaul & Sales Intelligence
**Version:** 1.0
**Status:** Ready for Implementation
**Prerequisite:** Phase 1 (frontend) complete. Phase 2 (Supabase) and Phase 3 (PWA) can run in parallel.

---

## 1. Objective

StoreOS is functional and approved. This phase focuses on:
- Fixing known bugs that affect data integrity
- Upgrading the inventory experience with quick restock and proper alerts
- Making the sales log useful with receipt-level detail on tap
- Fixing statement export to CSV (replacing HTML)
- Adding small but high-impact UX improvements across the board

---

## 2. Bug Fixes

### 2.1 Duplicate Item Names
**Problem:** Two products with the same name (or same name, different case) can be saved.

**Fix:**
- On product create AND edit, before saving, run a case-insensitive uniqueness check scoped to `business_id`:
```ts
const existing = await db.products
  .where('business_id').equals(businessId)
  .filter(p => p.name.toLowerCase() === newName.toLowerCase())
  .first()

if (existing && existing.id !== currentProductId) {
  // show inline field error, not a toast
  return
}
```
- Inline error copy: *"A product with this name already exists. Try adding a variant (e.g. 'Milo 500g')."*
- Error appears directly below the name field, not as a toast

### 2.2 Editing Items Erroring
**Problem:** Edit flow throws errors — likely a type mismatch between Dexie update and Supabase upsert.

**Fix:**
- Edit handler must follow the same write pattern as create: Dexie first, then Supabase upsert using the existing `id` as conflict key
- Ensure `buy_price`, `sell_price`, and `quantity` are explicitly parsed as numbers (`Number(value)`) before saving — string values cause NaN errors downstream
- After successful edit, re-fetch the product list so UI reflects changes immediately
- Add a loading/disabled state to the save button during submission to prevent double-tap

---

## 3. Inventory Overhaul

### 3.1 Layout — Accordion Rows
**Replace the current layout with an expandable accordion row list.**

**Collapsed row (default) shows:**
- Product image thumbnail (40x40px, rounded — placeholder initial letter if no image)
- **Product name (bold)**
- Category pill tag
- Stock quantity + unit (e.g. "24 units" or "6 packs")
- Selling price
- Low stock badge (red) if below threshold
- Expand chevron on the right

**Expanded row (on tap) reveals inline:**
- Buy price / Sell price side by side
- Pack size if applicable (e.g. "Pack of 40 units")
- SKU/Barcode if set
- Stock value (`quantity x buy_price`) e.g. "Stock Value: ₦12,400"
- Last restocked date
- Action row: **[Edit]** **[+ Add Stock]** **[Delete]**

### 3.2 Inventory Header Summary Strip
At the top of the inventory page, above the search bar:
```
Total Products: 48   |   Stock Value: ₦1,204,500   |   ⚠ Low Stock: 6 →
```
- "Low Stock: 6 →" is tappable → filters list to low stock items only
- Stock Value = sum of `(quantity x buy_price)` across all active products

### 3.3 Search & Filter Bar
- Search matches: product name AND category
- Filter dropdown: All Categories / [owner's custom categories]
- Toggle: All Stock / Low Stock Only
- Filters persist while on the page

### 3.4 Quick Restock — "+ Add Stock" Button
**This is a daily action. It must be frictionless.**

In the expanded accordion row, tapping "+ Add Stock" opens a **small inline panel** (not a new page):
- Input: quantity to add (number, autofocus)
- Optional: supplier name
- Optional: cost per unit (updates buy price)
- [Save] → updates Dexie + Supabase, logs a restock entry, collapses panel
- [Cancel] link to dismiss

### 3.5 Product Images (Optional)
- Image upload on add/edit product form — optional
- Compress before upload via `browser-image-compression` — max 200KB
- Store in Supabase Storage: `product-images/{business_id}/{product_id}.jpg`
- 40x40px thumbnail in collapsed row, 120x120px in expanded row
- Placeholder: grey circle with first letter of product name

### 3.6 Unit & Pack System
Every product now has a sell type defining how it is sold and how inventory deducts.

**New product fields:**
```ts
sell_type: 'unit' | 'pack' | 'both'
pack_size: number | null        // units per pack (e.g. 40 for Indomie)
pack_label: string | null       // e.g. "Carton", "Crate", "Pack", "Box"
unit_label: string | null       // e.g. "Sachet", "Piece", "Bottle"
sell_price_pack: number | null  // price per full pack
```

**Behaviours:**
- `unit` — sold in individual units only
- `pack` — sold in full packs only
- `both` — sold as full pack OR individual units; inventory stored in units internally

**Inventory display when `both`:**
- Show as: "120 units (3 packs)" when pack_size = 40

**Add/Edit form additions:**
- Sell Type selector (radio: Unit only / Pack only / Both)
- If Pack or Both → Pack Label + Pack Size inputs
- Unit Label input (optional)
- Pack Selling Price input (shown for Both or Pack)

### 3.7 Category Management
- Categories managed in **Settings → Categories** (no longer hardcoded)
- On product form, category is a searchable dropdown from owner's own list
- Default categories pre-loaded on onboarding: Beverages, Grains & Cereals, Household, Snacks, Personal Care, Frozen Foods, Other

---

## 4. Low Stock Alerts

### 4.1 Dashboard Card — Show Top Items
The low stock card on the dashboard shows the top 3 low stock items inline:
```
⚠ Low Stock (6 items)
  • Milo 500g — 2 units left
  • Indomie Chicken — 1 pack left
  • Peak Milk — 3 units left
  + 3 more →
```
Tapping the card navigates to `/dashboard/inventory?filter=low-stock`.

### 4.2 Low Stock Filter Deep Link
The inventory page reads the `filter` query param on mount:
- If `?filter=low-stock` → auto-applies the Low Stock filter
- Shows a banner: "Showing low stock items only — [Clear filter]"

### 4.3 Real-Time Toast on Sale Completion
After every POS sale is recorded and inventory is deducted:
- Check if any sold product's new quantity is at or below its `low_stock_threshold`
- If yes → show an in-app toast immediately:
  - Single item: *"⚠ Low stock: Milo 500g is down to 2 units."*
  - Multiple items: *"⚠ 3 items are now low on stock. View inventory →"*
- Toast is tappable → navigates to filtered inventory

### 4.4 PWA Push Notification on Sale (requires Phase 3)
Wire into `lib/notifications.ts` inside the POS sale completion handler:
```ts
async function checkAndNotifyLowStock(soldProducts: Product[]) {
  for (const product of soldProducts) {
    if (product.quantity <= product.low_stock_threshold) {
      await sendLocalNotification(
        '⚠ Low Stock Alert',
        `${product.name} is down to ${product.quantity} ${product.unit_label ?? 'units'}. Tap to restock.`,
        '/dashboard/inventory?filter=low-stock'
      )
    }
  }
}
```

### 4.5 Daily Morning Low Stock Digest (requires Phase 3)
Each morning at 9:00 AM (via service worker or on app open):
- Query all products where `quantity <= low_stock_threshold`
- If any exist → send one grouped notification:
  - Title: *"StoreOS — Morning Stock Check"*
  - Body: *"You have X items running low. Open StoreOS to restock."*
  - Tap → opens filtered inventory

### 4.6 Per-Product Threshold
Each product has its own `low_stock_threshold`. Confirm:
- Editable on the add/edit product form — label: "Alert me when stock falls below:"
- Visible in the expanded accordion row
- Defaults to the global threshold set in Settings if not individually configured

---

## 5. Sales Log Improvements

### 5.1 Tap Sale Row → Receipt Modal
Tapping any row in the sales log opens a **Receipt Bottom Sheet** (slides up from bottom on mobile, centered modal on desktop).

### 5.2 Receipt Modal Contents
```
─────────────────────────────────
        [Business Logo / Initial]
           STORE NAME
         Address Line
─────────────────────────────────
  Receipt #00142
  Wed, 11 March 2026 — 2:34 PM
─────────────────────────────────
  ITEMS SOLD
  Milo 500g (Unit)        x2     ₦900
  Indomie Chicken (Pack)  x1     ₦5,500
  Peak Milk (Unit)        x3     ₦1,200
─────────────────────────────────
  Total                          ₦7,600

  Payment: Credit
  Customer: Emeka Okafor
  Outstanding Balance: ₦14,300
─────────────────────────────────
     Thank you for your patronage
─────────────────────────────────
  [Share via WhatsApp]   [Void Sale]   [Close]
```

- Show unit type next to each item name (Unit / Pack / Carton etc.)
- If Credit → show customer name + outstanding balance after this transaction
- If Cash/Transfer → show payment type only
- Share via WhatsApp → formats receipt as plain text, opens `https://wa.me/?text=...`

### 5.3 Sale Void / Return
**[Void Sale]** button in the receipt modal:
- Confirmation dialog: *"Void this sale? Inventory will be restored and any credit will be reversed."*
- On confirm:
  - Sets `voided: true` on the sale record (Dexie + Supabase)
  - Restores deducted inventory quantities
  - If credit sale → reverses the credit_transaction entry
  - Voided sales remain in the log with strikethrough + "Voided" badge
  - Excluded from revenue totals, dashboard figures, and statements
- **Owner role only** — Staff/Cashier does not see this button

### 5.4 Sales Log Row Design
Each row shows:
- Time of sale
- Item count (e.g. "3 items")
- Total amount (bold)
- Payment type badge: green = Cash, blue = Transfer, amber = Credit
- Customer name if credit sale
- Voided sales: strikethrough, grey "Voided" badge
- Right chevron indicating row is tappable

---

## 6. Statement Export — CSV (replaces HTML download)

### 6.1 Change Export Format
**Remove the HTML statement download. Replace with CSV.**

CSV opens directly in Excel, Google Sheets, and Numbers — tools the owner or their accountant already uses. More appropriate as a formal financial record.

### 6.2 Daily Statement CSV Structure
Filename: `StoreOS_Daily_Statement_YYYY-MM-DD.csv`

```
STOREOS DAILY STATEMENT,,
Business Name:,Chidi's Superstore,
Date:,11 March 2026,
Generated:,11 March 2026 3:00 PM,
,,
SUMMARY,,
Total Revenue,₦182500,
Cash Received,₦120000,
Transfers Received,₦42500,
Credit Extended,₦20000,
Repayments Received,₦15000,
Net Cash Position,₦162500,
,,
SALES LOG,,
Time,Items Sold,Total,Payment,Customer
08:14 AM,"Milo 500g x2, Peak Milk x1",₦2100,Cash,
09:32 AM,"Indomie Chicken Pack x2",₦11000,Transfer,
11:05 AM,"Sugar 1kg x5, Flour 2kg x2",₦6500,Credit,Emeka Okafor
,,
CREDIT TRANSACTIONS,,
Customer,Type,Amount,Balance After,Time
Emeka Okafor,Debit,₦6500,₦14300,11:05 AM
Ada Nwachukwu,Repayment,₦5000,₦8200,01:22 PM
,,
LOW STOCK ITEMS (END OF DAY),,
Product,Current Stock,Threshold
Milo 500g,2 units,5
Indomie Chicken,1 pack,3
```

### 6.3 Monthly Statement CSV Structure
Filename: `StoreOS_Monthly_Statement_YYYY-MM.csv`

```
STOREOS MONTHLY STATEMENT,,
Business Name:,Chidi's Superstore,
Period:,March 2026,
,,
MONTHLY SUMMARY,,
Total Revenue,₦4820000,
Total Cash,₦3200000,
Total Transfers,₦980000,
Total Credit Extended,₦640000,
Total Repayments,₦420000,
,,
DAILY BREAKDOWN,,
Date,Revenue,Cash,Transfer,Credit,Repayments,Transactions
01 Mar,₦182500,₦120000,₦42500,₦20000,₦15000,48
02 Mar,₦210000,₦155000,₦35000,₦20000,₦0,52
,,
TOP 10 PRODUCTS BY REVENUE,,
Product,Units Sold,Revenue
Indomie Chicken (Pack),142,₦781000
Milo 500g,89,₦400500
,,
OUTSTANDING CREDIT,,
Customer,Amount Owed,Last Transaction Date
Emeka Okafor,₦14300,11 Mar
Ada Nwachukwu,₦8200,09 Mar
```

### 6.4 CSV Generation Utility
No library needed:
```ts
// lib/export-csv.ts
export function generateCSV(rows: string[][]): string {
  return rows
    .map(row =>
      row.map(cell =>
        cell.includes(',') || cell.includes('\n')
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    )
    .join('\n')
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```
Note: The `\uFEFF` BOM prefix ensures Naira (₦) and other special characters render correctly when opened in Excel.

### 6.5 Statement Page Update
- Replace "Download HTML" with **"Download CSV"** button
- Keep the on-screen preview as HTML (fine for viewing, no change needed)
- Add second button: **"Share Summary via WhatsApp"** — sends a short plain-text version of the summary section only

---

## 7. Additional UX Improvements

### 7.1 Bold Product Names Everywhere
Product names must use `font-semibold` or `font-bold` in all list views:
- Inventory list
- POS cart
- Sales log rows
- Receipt modal
- Credit tracker

### 7.2 POS Search Improvement
- Search matches: name, category, and SKU
- Show category as a subtitle under each product result in the search dropdown

### 7.3 Empty States
All list screens need proper empty states:
- Inventory: *"No products yet. Add your first product to get started."* + [Add Product] button
- Sales Log: *"No sales recorded today. Head to POS to record your first sale."*
- Credit Tracker: *"No credit customers yet."*
- Low stock filter (none): *"All your stock levels look good. 👍"*

---

## 8. Database Migration

Run in Supabase SQL editor:
```sql
alter table products
  add column if not exists sell_type text not null default 'unit'
    check (sell_type in ('unit', 'pack', 'both')),
  add column if not exists pack_size integer,
  add column if not exists pack_label text,
  add column if not exists unit_label text,
  add column if not exists sell_price_pack numeric(12,2),
  add column if not exists image_url text,
  add column if not exists sku text;
```

Update Dexie schema version in `lib/db.ts`:
```ts
this.version(2).stores({
  products: '++id, business_id, name, category, sell_type, sku',
  // all other tables unchanged
})
```

---

## 9. Implementation Order

1. Fix duplicate name validation (Section 2.1)
2. Fix edit item errors (Section 2.2)
3. Run Supabase migration + bump Dexie version (Section 8)
4. Update add/edit product form with unit/pack fields (Section 3.6)
5. Rebuild inventory as accordion rows (Section 3.1)
6. Add inventory header summary strip (Section 3.2)
7. Implement quick restock inline panel (Section 3.4)
8. Wire low stock deep link from dashboard card (Section 4.1–4.2)
9. Wire real-time low stock toast on POS sale completion (Section 4.3)
10. Wire low stock PWA notification (Section 4.4) — only after Phase 3 is done
11. Update POS cart for unit/pack toggle on `both` type items
12. Update sales log row design (Section 5.4)
13. Implement receipt modal on sale row tap (Section 5.1–5.2)
14. Implement void sale (Section 5.3)
15. Replace HTML export with CSV (Section 6)
16. Apply bold product names globally (Section 7.1)
17. Add empty states to all list screens (Section 7.3)

---

## 10. Definition of Done

- [ ] Duplicate product names blocked with inline error
- [ ] Editing a product saves correctly with no errors
- [ ] Inventory displays as accordion rows with smooth expand/collapse
- [ ] "+ Add Stock" works from expanded row without navigating away
- [ ] Dashboard low stock card shows top 3 items and links to filtered inventory
- [ ] Toast fires immediately when a sale causes any product to hit low stock
- [ ] Tapping a sale in the sales log opens receipt modal with items, quantities, unit types, totals, and payment info
- [ ] Void sale reverses inventory and credit, marked with strikethrough in log
- [ ] Statement downloads as a properly formatted CSV (not HTML), renders correctly in Excel
- [ ] Product names are bold in all list views
- [ ] All list screens show a proper empty state when no data exists

---

*Feed this document to Cursor. Follow Section 9 implementation order exactly. PWA notification steps (4.4, 4.5) are blocked until Phase 3 is complete — skip them and return after.*
