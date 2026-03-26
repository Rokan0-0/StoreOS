# PRD — StoreOS Unit & Pack System
## Phase 4.3: Product Sell Types, Pack Pricing & POS Selection
**Version:** 1.0
**Priority:** HIGH
**Status:** Ready for Implementation

---

## 1. Objective

Currently every product is sold in units only. Real supermarkets sell items both individually and in bulk packs (a bottle of Coke vs a crate, a sachet of Milo vs a tin). This update adds a sell type system to products so owners can define how each item is sold, set separate prices for units and packs, and cashiers can choose at the point of sale.

---

## 2. Database Changes

### 2.1 Supabase Migration
Run in Supabase SQL editor:

```sql
alter table products
  add column if not exists sell_type text not null default 'unit'
    check (sell_type in ('unit', 'pack', 'both')),
  add column if not exists unit_label text default 'Unit',
  add column if not exists pack_label text default 'Pack',
  add column if not exists pack_size integer,
  add column if not exists sell_price_pack numeric(12,2);
```

### 2.2 Dexie Schema Update
In `lib/db.ts`, bump the version and update the products store:

```ts
this.version(2).stores({
  products: 'id, business_id, name, category, sell_type',
  // all other tables unchanged — copy them exactly from version 1
})
```

**IMPORTANT:** Copy all other table definitions from version 1 into version 2 exactly. Dexie requires all stores to be redeclared on a version bump.

### 2.3 Updated Product TypeScript Interface
Update the `Product` interface in `lib/db.ts`:

```ts
export interface Product {
  id: string
  business_id: string
  name: string
  category?: string
  buy_price: number
  sell_price: number          // price per unit
  sell_price_pack?: number    // price per full pack (optional)
  quantity: number            // always stored as units internally
  low_stock_threshold: number
  sell_type: 'unit' | 'pack' | 'both'
  unit_label: string          // e.g. "Bottle", "Sachet", "Piece" — default "Unit"
  pack_label: string          // e.g. "Crate", "Carton", "Pack" — default "Pack"
  pack_size?: number          // how many units are in one pack e.g. 24 for a crate of Coke
  created_at: string
  updated_at: string
}
```

---

## 3. Add / Edit Product Form Changes

### 3.1 New Fields to Add
After the existing sell_price field, add the following fields to both the Add Product and Edit Product forms.

**Field: Sell Type**
- Label: "How is this product sold?"
- Type: Radio button group or segmented control
- Options:
  - Unit only — sold individually (e.g. a single bottle)
  - Pack only — sold in bulk packs only (e.g. a full crate)
  - Both — can be sold as a unit OR as a full pack
- Default: "Unit only"

**Field: Unit Label** (shown for sell_type = 'unit' or 'both')
- Label: "Unit name"
- Type: Text input
- Placeholder: "e.g. Bottle, Sachet, Piece, Tin"
- Default value: "Unit"
- Helper text: "What do you call a single item?"

**Field: Pack Label** (shown for sell_type = 'pack' or 'both')
- Label: "Pack name"
- Type: Text input
- Placeholder: "e.g. Crate, Carton, Pack, Box"
- Default value: "Pack"
- Helper text: "What do you call a full pack?"

**Field: Units per Pack** (shown for sell_type = 'pack' or 'both')
- Label: "How many units are in one pack?"
- Type: Number input, min 2
- Placeholder: "e.g. 24 for a crate of Coke"
- Required if sell_type is 'pack' or 'both'

**Field: Unit Price** (existing sell_price field)
- Rename label from "Selling Price" to "Price per Unit (₦)"
- Only shown when sell_type = 'unit' or 'both'

**Field: Pack Price** (new field — sell_price_pack)
- Label: "Price per Pack (₦)"
- Type: Number input
- Placeholder: "e.g. 3600"
- Helper text: "Leave blank to auto-calculate from unit price × pack size"
- Only shown when sell_type = 'pack' or 'both'
- If left blank → auto-calculate on save: sell_price_pack = sell_price × pack_size
- Show a live preview below the field: "Auto: ₦150 × 24 = ₦3,600" updating as values change

### 3.2 Form Validation Rules
- If sell_type is 'pack' or 'both' → pack_size is required and must be ≥ 2
- If sell_type is 'unit' or 'both' → sell_price is required
- If sell_type is 'pack' → sell_price_pack is required (or auto-calculated)
- unit_label and pack_label default to "Unit" and "Pack" if left blank — never save empty strings

### 3.3 Conditional Field Visibility
Fields show/hide based on the selected sell_type. Use simple state:

```ts
const [sellType, setSellType] = useState<'unit' | 'pack' | 'both'>('unit')

// Show unit price + unit label when:
const showUnitFields = sellType === 'unit' || sellType === 'both'

// Show pack price + pack label + pack size when:
const showPackFields = sellType === 'pack' || sellType === 'both'
```

Fields animate in/out smoothly — use a simple CSS transition on opacity and height.

### 3.4 Example — Indomie Chicken (Both)
```
Product name:        Indomie Chicken
Category:            Grains & Cereals
Buy price:           ₦120
Sell type:           Both
Unit name:           Sachet
Unit price:          ₦150
Pack name:           Pack
Units per pack:      40
Pack price:          ₦5,500   (or leave blank → auto: ₦150 × 40 = ₦6,000)
```

### 3.5 Example — Coca-Cola (Both)
```
Product name:        Coca-Cola 50cl
Category:            Beverages
Buy price:           ₦150
Sell type:           Both
Unit name:           Bottle
Unit price:          ₦200
Pack name:           Crate
Units per pack:      24
Pack price:          ₦4,320   (or auto: ₦200 × 24 = ₦4,800)
```

---

## 4. Inventory Display Changes

### 4.1 Collapsed Row
Show sell type context next to the stock quantity:
- sell_type = 'unit': "30 Bottles"
- sell_type = 'pack': "6 Crates"
- sell_type = 'both': "120 Bottles (5 Crates)"

For 'both', show units first then packs in brackets:
```ts
const packsDisplay = pack_size ? Math.floor(quantity / pack_size) : null
const display = sellType === 'both' && packsDisplay !== null
  ? `${quantity} ${unit_label}s (${packsDisplay} ${pack_label}s)`
  : `${quantity} ${unit_label}s`
```

### 4.2 Expanded Row
Show pricing clearly:
```
Price per Bottle:    ₦200
Price per Crate:     ₦4,320
Pack size:           24 Bottles per Crate
Stock value:         ₦24,000  (120 × ₦200)
```

---

## 5. POS (Sales Recording) Changes

### 5.1 Product Search Result
When a product appears in the POS search results, show its sell type context:
- Unit only: "₦200 / Bottle"
- Pack only: "₦4,320 / Crate"
- Both: "₦200 / Bottle · ₦4,320 / Crate"

### 5.2 Adding to Cart
When a product with sell_type = 'both' is tapped to add to the cart, show a small selection modal before adding:

```
─────────────────────────────
  Coca-Cola 50cl
  How are you selling this?
─────────────────────────────
  [Bottle]      ₦200 each
  [Crate]       ₦4,320 each
─────────────────────────────
```

- Two large tappable buttons — one for unit, one for pack
- Tapping either adds the item to the cart with the correct sell_mode and price
- For sell_type = 'unit' only → adds directly, no modal
- For sell_type = 'pack' only → adds directly as pack, no modal

### 5.3 Cart Item Display
Each cart item shows what it was sold as:

```
Coca-Cola 50cl (Crate)     ×2    ₦8,640
Indomie Chicken (Sachet)   ×5    ₦750
```

The label in brackets is the unit_label or pack_label depending on what was selected.

### 5.4 Cart Item — Changing Sell Mode
After adding to cart, allow changing between unit/pack by tapping the label in brackets:
- Tapping "(Crate)" → toggles to "(Bottle)" and updates price and quantity accordingly
- Only available for sell_type = 'both' products
- Quantity resets to 1 when switching modes to avoid confusion

### 5.5 Inventory Deduction on Sale
When a sale is completed, deduct from inventory in units regardless of sell mode:

```ts
function getUnitDeduction(item: CartItem, product: Product): number {
  if (item.sell_mode === 'pack' && product.pack_size) {
    return item.quantity * product.pack_size  // 2 crates × 24 = 48 units
  }
  return item.quantity  // units sold directly
}
```

### 5.6 Sale Item Record
The `items` JSONB array on each sale record must store sell_mode so receipts display correctly:

```ts
interface SaleItem {
  product_id: string
  name: string
  quantity: number
  sell_mode: 'unit' | 'pack'   // ADD THIS
  sell_label: string            // "Bottle" or "Crate" — ADD THIS
  unit_price: number
  total: number
}
```

---

## 6. Receipt Display Changes

### 6.1 Receipt Modal (Sales Log tap)
Show sell label next to each item:

```
Coca-Cola 50cl (Crate)    ×2    ₦8,640
Indomie Chicken (Sachet)  ×5    ₦750
Peak Milk 400g (Tin)      ×3    ₦5,400
```

The sell_label stored on the sale item is used here — do not re-derive from the product, since the product's labels could change after the sale was recorded.

---

## 7. Migration for Existing Products

When the Dexie version bumps to 2, existing products need default values for the new fields. Handle this in a one-time migration:

```ts
this.version(2).stores({
  products: 'id, business_id, name, category, sell_type',
}).upgrade(async tx => {
  await tx.table('products').toCollection().modify(product => {
    if (!product.sell_type) product.sell_type = 'unit'
    if (!product.unit_label) product.unit_label = 'Unit'
    if (!product.pack_label) product.pack_label = 'Pack'
  })
})
```

This runs automatically on first load after the update — existing products become 'unit' type by default, which is correct.

---

## 8. Implementation Order

1. Run Supabase SQL migration (Section 2.1)
2. Update `Product` TypeScript interface (Section 2.3)
3. Bump Dexie version with upgrade migration (Section 2.2 + Section 7)
4. Update Add Product form with new conditional fields (Section 3.1–3.3)
5. Update Edit Product form with the same fields (pre-populate existing values)
6. Update inventory collapsed row display (Section 4.1)
7. Update inventory expanded row display (Section 4.2)
8. Update POS product search results display (Section 5.1)
9. Add sell mode selection modal to POS for 'both' type products (Section 5.2)
10. Update cart item display with sell label (Section 5.3)
11. Add sell mode toggle on cart items (Section 5.4)
12. Update inventory deduction logic on sale completion (Section 5.5)
13. Update SaleItem interface to include sell_mode and sell_label (Section 5.6)
14. Update receipt modal to show sell labels (Section 6.1)

---

## 9. Definition of Done

- [ ] Add/Edit product form shows sell type selector with conditional fields
- [ ] Unit-only product: only unit price and unit label shown
- [ ] Pack-only product: only pack label, pack size, and pack price shown
- [ ] Both product: all fields shown, pack price auto-calculates if left blank
- [ ] Inventory list shows stock in correct format (e.g. "120 Bottles (5 Crates)")
- [ ] POS search shows price per unit and/or per pack depending on sell type
- [ ] Adding a 'both' product to POS shows a unit/pack selection modal
- [ ] Cart shows sell label in brackets next to each item name
- [ ] Sale completion deducts correct number of units from inventory (pack × pack_size)
- [ ] Receipt modal shows sell label next to each item
- [ ] Existing products default to 'unit' type after Dexie migration — no data loss

---

*Feed to Cursor. Complete the Dexie migration (Step 3) before touching any UI — getting the schema right first prevents data shape mismatches downstream.*
