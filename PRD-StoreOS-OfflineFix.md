# PRD — StoreOS Critical Fix: Offline & Data Persistence
## Phase 2.5: Service Worker + IndexedDB Write Layer
**Version:** 1.0
**Priority:** CRITICAL — Fix before any further feature work
**Status:** Ready for immediate implementation

---

## 1. Problem Summary

Two critical failures confirmed via DevTools:

1. **No service worker registered** — the app returns `net::ERR_FAILED` when offline. The offline fallback page shows but the dashboard never loads. `next-pwa` has not been properly configured or has never run in a production build.

2. **IndexedDB tables exist but are empty** — `StoreOSDB` is present with correct table schemas but all tables show `Total entries: 0`. Data is not being written to Dexie at all. This means:
   - Logging out clears all data
   - Opening on a different device shows no history
   - Offline mode has no local data to read from even if the service worker was working

Both must be fixed together. A working service worker without local data is useless, and local data without a service worker still breaks offline.

---

## 2. Fix 1 — Service Worker via next-pwa

### 2.1 Install next-pwa
```bash
npm install next-pwa
npm install --save-dev @types/next-pwa
```

### 2.2 Update next.config.ts
Replace the existing config entirely with:

```ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Cache the app shell — all Next.js page navigations
      urlPattern: /^https:\/\/store-os-pi\.vercel\.app\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'storeos-pages',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 3,
      },
    },
    {
      // Cache all static assets aggressively
      urlPattern: /\.(?:js|css|woff2|woff|ttf|png|jpg|jpeg|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'storeos-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Never cache Supabase API calls — always needs live auth
      urlPattern: /supabase\.co/,
      handler: 'NetworkOnly',
    },
  ],
  fallbacks: {
    document: '/offline',
  },
})

module.exports = withPWA({
  // paste any existing Next.js config options here
})
```

### 2.3 Add offline fallback page
Create `app/offline/page.tsx`:
```tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-6">📦</div>
      <h1 className="text-2xl font-bold mb-3">You're offline</h1>
      <p className="text-gray-500 max-w-sm">
        Don't worry — everything you've recorded is saved on this device.
        Your data will sync automatically when you're back online.
      </p>
      <a
        href="/dashboard"
        className="mt-8 px-6 py-3 bg-green-700 text-white rounded-lg font-medium"
      >
        Go to Dashboard
      </a>
    </div>
  )
}
```

### 2.4 Add manifest.json
Create `public/manifest.json`:
```json
{
  "name": "StoreOS",
  "short_name": "StoreOS",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#166534",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Place placeholder icons at `public/icon-192.png` and `public/icon-512.png` — use any 192x192 and 512x512 PNG for now.

### 2.5 Link manifest in layout
In `app/layout.tsx`, add inside `<head>`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#166534" />
```

### 2.6 CRITICAL — Production build requirement
The service worker is ONLY generated during `next build`. It does NOT exist in `next dev`.

To verify it works locally before deploying:
```bash
npm run build
npm run start
# Then open http://localhost:3000 and test offline in DevTools
```

On Vercel, the build runs automatically on push — so deploying this config will register the service worker on the live site.

---

## 3. Fix 2 — IndexedDB Write Layer (Dexie)

This is the more critical fix. The Dexie schema exists but nothing is being written to it. Every single create/update/delete operation in the app must write to Dexie first.

### 3.1 Verify Dexie is initialised correctly
Open `lib/db.ts` and confirm it looks like this. If it doesn't, replace it:

```ts
import Dexie, { Table } from 'dexie'

export interface Business {
  id: string
  owner_id: string
  name: string
  type: string
  address?: string
  phone?: string
  logo_url?: string
  low_stock_threshold: number
  created_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  category?: string
  buy_price: number
  sell_price: number
  quantity: number
  low_stock_threshold: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string
  phone?: string
  created_at: string
}

export interface Sale {
  id: string
  business_id: string
  customer_id?: string
  items: SaleItem[]
  total: number
  payment_type: 'cash' | 'transfer' | 'credit'
  voided?: boolean
  created_at: string
}

export interface SaleItem {
  product_id: string
  name: string
  quantity: number
  unit_price: number
  total: number
}

export interface CreditTransaction {
  id: string
  business_id: string
  customer_id: string
  sale_id?: string
  amount: number
  type: 'debit' | 'repayment'
  note?: string
  created_at: string
}

export interface SyncQueueItem {
  id?: number
  table_name: string
  operation: 'insert' | 'update' | 'delete'
  record_id: string
  payload: object
  created_at: string
}

class StoreOSDatabase extends Dexie {
  businesses!: Table<Business>
  products!: Table<Product>
  customers!: Table<Customer>
  sales!: Table<Sale>
  credit_transactions!: Table<CreditTransaction>
  sync_queue!: Table<SyncQueueItem>

  constructor() {
    super('StoreOSDB')
    this.version(1).stores({
      businesses: 'id, owner_id',
      products: 'id, business_id, name, category',
      customers: 'id, business_id',
      sales: 'id, business_id, customer_id, created_at',
      credit_transactions: 'id, business_id, customer_id, type',
      sync_queue: '++id, table_name, operation, record_id',
    })
  }
}

export const db = new StoreOSDatabase()
```

### 3.2 The Write Pattern — Apply to Every Operation
Every create/update/delete in the entire app must follow this exact pattern:

```ts
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'

// EXAMPLE: Adding a product
async function addProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const product: Product = {
    ...data,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Step 1: Write to Dexie FIRST — this is instant and works offline
  await db.products.add(product)

  // Step 2: Add to sync queue
  await db.sync_queue.add({
    table_name: 'products',
    operation: 'insert',
    record_id: product.id,
    payload: product,
    created_at: new Date().toISOString(),
  })

  // Step 3: Try Supabase immediately if online
  if (navigator.onLine) {
    try {
      await supabase.from('products').insert(product)
      // Remove from sync queue on success
      await db.sync_queue
        .where('record_id').equals(product.id)
        .and(item => item.operation === 'insert')
        .delete()
    } catch (err) {
      // Supabase failed — sync queue entry stays for later
      console.warn('Supabase sync failed, queued for later:', err)
    }
  }

  return product
}
```

Install uuid if not already present:
```bash
npm install uuid
npm install --save-dev @types/uuid
```

### 3.3 Apply the Write Pattern to All Modules
Every module that currently writes data must be updated. Go through each file and apply the pattern from 3.2:

**Products (inventory module)**
- `addProduct()` — insert to Dexie + queue + try Supabase
- `updateProduct()` — use `db.products.update(id, changes)` + queue with operation `update`
- `deleteProduct()` — use `db.products.delete(id)` + queue with operation `delete`

**Customers (credit module)**
- `addCustomer()` — same pattern
- `updateCustomer()` — same pattern

**Sales (POS module)**
- `recordSale()` — insert sale to Dexie + queue + deduct inventory in Dexie + queue inventory update

**Credit Transactions**
- `addCreditTransaction()` — same pattern
- `addRepayment()` — same pattern

**Business profile (settings)**
- `updateBusiness()` — same pattern, table: `businesses`

### 3.4 All Reads Must Come from Dexie
Every screen that displays data must read from Dexie, not Supabase directly:

```ts
// WRONG — reads from Supabase, breaks offline
const { data } = await supabase.from('products').select('*')

// CORRECT — reads from Dexie, works offline
const products = await db.products
  .where('business_id').equals(currentBusinessId)
  .toArray()
```

Go through every page component and replace any `supabase.from(...).select(...)` calls with Dexie reads.

---

## 4. Fix 3 — Sync Worker (Supabase hydration on login)

### 4.1 Create lib/sync.ts
```ts
import { db } from './db'
import { supabase } from './supabase'

export async function hydrateFromSupabase(businessId: string) {
  // Called once on login — pulls all cloud data into Dexie
  if (!navigator.onLine) return

  try {
    const [products, customers, sales, creditTx] = await Promise.all([
      supabase.from('products').select('*').eq('business_id', businessId),
      supabase.from('customers').select('*').eq('business_id', businessId),
      supabase.from('sales').select('*').eq('business_id', businessId),
      supabase.from('credit_transactions').select('*').eq('business_id', businessId),
    ])

    // Upsert everything into Dexie (Supabase wins on conflict)
    if (products.data?.length) await db.products.bulkPut(products.data)
    if (customers.data?.length) await db.customers.bulkPut(customers.data)
    if (sales.data?.length) await db.sales.bulkPut(sales.data)
    if (creditTx.data?.length) await db.credit_transactions.bulkPut(creditTx.data)

    console.log('Hydration complete')
  } catch (err) {
    console.error('Hydration failed:', err)
  }
}

export async function drainSyncQueue() {
  // Called on reconnect — pushes queued local writes to Supabase
  if (!navigator.onLine) return

  const queue = await db.sync_queue.orderBy('id').toArray()
  if (queue.length === 0) return

  for (const item of queue) {
    try {
      if (item.operation === 'insert' || item.operation === 'update') {
        await supabase.from(item.table_name).upsert(item.payload)
      } else if (item.operation === 'delete') {
        await supabase.from(item.table_name).delete().eq('id', item.record_id)
      }
      // Success — remove from queue
      await db.sync_queue.delete(item.id!)
    } catch (err) {
      console.warn(`Sync failed for ${item.table_name}:${item.record_id}`, err)
      // Leave in queue — will retry next time
    }
  }
}
```

### 4.2 Wire hydration to login
In the auth context or wherever login completes, call:
```ts
await hydrateFromSupabase(business.id)
```

This is what fixes the cross-device and logout/login data loss. On every login, the app pulls the latest cloud data into local Dexie before the user sees anything.

### 4.3 Wire drainSyncQueue to online event
In the root layout (`app/layout.tsx`) or a client component mounted at the root:
```ts
useEffect(() => {
  window.addEventListener('online', drainSyncQueue)
  return () => window.removeEventListener('online', drainSyncQueue)
}, [])
```

Also call `drainSyncQueue()` once on app mount in case there are queued items from a previous offline session.

---

## 5. Implementation Order

Do these in exact order — do not skip steps:

1. Install `uuid` package (`npm install uuid @types/uuid`)
2. Install `next-pwa` (`npm install next-pwa`)
3. Replace `lib/db.ts` with the schema from Section 3.1
4. Create `lib/sync.ts` from Section 4.1
5. Update `next.config.ts` with next-pwa config from Section 2.2
6. Create `public/manifest.json` from Section 2.4
7. Add manifest link to `app/layout.tsx` (Section 2.5)
8. Create `app/offline/page.tsx` (Section 2.3)
9. Update ALL data write operations to follow the pattern in Section 3.2 — go module by module: products, customers, sales, credit transactions, business settings
10. Update ALL data read operations to read from Dexie not Supabase (Section 3.4)
11. Wire `hydrateFromSupabase()` to login completion (Section 4.2)
12. Wire `drainSyncQueue()` to `window online` event in root layout (Section 4.3)
13. Run `npm run build && npm run start` locally
14. Open DevTools → Application → Service Workers — confirm service worker is registered
15. Open DevTools → Application → IndexedDB → StoreOSDB — add a product and confirm entries appear
16. Set Network to Offline in DevTools — refresh page — confirm dashboard loads from cache
17. Deploy to Vercel

---

## 6. How to Verify Each Fix

### Service Worker
- Go to DevTools → Application → Service Workers
- Should show: `store-os-pi.vercel.app` with status "activated and running"
- Set network to Offline → refresh → dashboard must load (not show offline error)

### IndexedDB Writes
- Add a product in the inventory page
- Go to DevTools → Application → IndexedDB → StoreOSDB → products
- The product must appear as an entry with all fields populated
- Set network to Offline — the product must still be visible in the app

### Cross-Device Persistence
- Add a product on Device A (online)
- Log in on Device B → product must appear (hydrated from Supabase)

### Logout → Login Persistence
- Add a product
- Log out
- Log back in
- Product must still be there (hydrated from Supabase on login)

### Offline Data Entry
- Set DevTools to Offline
- Add a product
- Check IndexedDB — entry must appear
- Go back Online
- Check Supabase table — entry must have synced

---

## 7. Definition of Done

- [ ] Service worker shows as registered in DevTools Application tab
- [ ] Dashboard loads fully when DevTools network is set to Offline
- [ ] Adding a product writes an entry to IndexedDB visibly in DevTools
- [ ] Logging out and back in does not clear any data
- [ ] Opening the app on a second device shows the same data
- [ ] Adding data while offline syncs to Supabase when back online
- [ ] Supabase tables contain the same records as IndexedDB after a sync

---

*This is the highest priority fix in the entire project. Feed this to Cursor immediately and do not proceed with Phase 4 improvements until all 7 items in the Definition of Done are checked.*
