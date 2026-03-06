# PRD — StoreOS Database & Backend Integration
## Phase 2: Supabase Cloud Sync + Auth + RLS
**Version:** 1.0
**Status:** Ready for Implementation
**Prerequisite:** Phase 1 (local Dexie.js frontend) is complete and verified.

---

## 1. Objective

The local Dexie.js layer works. Now we need to:
1. Persist all data to Supabase (Postgres) so it survives device changes and is accessible anywhere
2. Add real authentication (email/password + phone OTP) so each business has its own isolated data
3. Implement offline-first sync — Dexie remains the local source of truth, Supabase is the cloud mirror
4. Enforce Row-Level Security (RLS) so no business can ever see another business's data

---

## 2. Supabase Project Setup

### 2.1 Environment Variables
Create/update `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 2.2 Install Supabase client
```bash
npm install @supabase/supabase-js
```

Create `lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 3. Database Schema

Run the following SQL in the Supabase SQL editor **in order**.

### 3.1 Enable UUID extension
```sql
create extension if not exists "uuid-ossp";
```

### 3.2 businesses
```sql
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text default 'Supermarket',
  address text,
  phone text,
  logo_url text,
  low_stock_threshold integer default 5,
  created_at timestamptz default now()
);

alter table businesses enable row level security;

create policy "Owner can manage their business"
  on businesses for all
  using (auth.uid() = owner_id);
```

### 3.3 products
```sql
create table products (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  category text,
  buy_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  quantity integer not null default 0,
  low_stock_threshold integer default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products enable row level security;

create policy "Business owner can manage products"
  on products for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
```

### 3.4 customers
```sql
create table customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

alter table customers enable row level security;

create policy "Business owner can manage customers"
  on customers for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
```

### 3.5 sales
```sql
create table sales (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete set null,
  items jsonb not null default '[]',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_type text not null check (payment_type in ('cash', 'transfer', 'credit')),
  note text,
  created_at timestamptz default now()
);

alter table sales enable row level security;

create policy "Business owner can manage sales"
  on sales for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
```

> `items` is a JSONB array. Each item: `{ product_id, name, quantity, unit_price, total }`

### 3.6 credit_transactions
```sql
create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete cascade not null,
  sale_id uuid references sales(id) on delete set null,
  amount numeric(12,2) not null,
  type text not null check (type in ('debit', 'repayment')),
  note text,
  created_at timestamptz default now()
);

alter table credit_transactions enable row level security;

create policy "Business owner can manage credit"
  on credit_transactions for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
```

### 3.7 statements
```sql
create table statements (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  type text not null check (type in ('daily', 'monthly')),
  period_start date not null,
  period_end date not null,
  total_revenue numeric(12,2) default 0,
  total_cash numeric(12,2) default 0,
  total_transfer numeric(12,2) default 0,
  total_credit_extended numeric(12,2) default 0,
  total_repayments numeric(12,2) default 0,
  data_json jsonb,
  generated_at timestamptz default now()
);

alter table statements enable row level security;

create policy "Business owner can manage statements"
  on statements for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
```

---

## 4. Authentication

### 4.1 Auth Flow
- Use Supabase Auth with **email + password** for v1
- Phone OTP is optional/v2
- On sign up → create user in `auth.users` → then create a row in `businesses`
- On sign in → fetch their `business` record and store in React context
- On sign out → clear context and redirect to `/`

### 4.2 Auth Context
Create `lib/auth-context.tsx`:
- Wraps the app in a provider
- Exposes: `user`, `business`, `loading`, `signIn()`, `signUp()`, `signOut()`
- On mount, calls `supabase.auth.getSession()` to restore session
- Listens to `supabase.auth.onAuthStateChange` to react to login/logout

### 4.3 Route Protection
Create `middleware.ts` at project root:
- Protect all `/dashboard/*` routes
- If no active session → redirect to `/login`
- If session exists but no `business` record → redirect to `/onboarding`

### 4.4 Auth Pages to Build

**`/login`**
- Email + password form
- "Don't have an account? Sign up" link
- Error handling for wrong credentials

**`/signup`**
- Email + password
- On success → redirect to `/onboarding`

**`/onboarding`**
- Step 1: Business name + type (dropdown: Supermarket / Provision Store / General Store)
- Step 2: Address + phone
- Step 3: Optional logo upload (Supabase Storage bucket: `logos`)
- On complete → insert into `businesses` table → redirect to `/dashboard`
- Progress bar across top

---

## 5. Offline-First Sync Architecture

### 5.1 Core Principle
**Dexie (IndexedDB) is the source of truth for reads. Supabase is the sync target.**

All UI reads from Dexie. All writes go to Dexie first, then attempt Supabase. If offline, writes are queued and synced when connection is restored.

### 5.2 Sync Queue
Add a `sync_queue` table to Dexie (local only — never in Supabase):
```ts
// In lib/db.ts — add to existing Dexie schema
sync_queue: '++id, table_name, operation, record_id, created_at'
```

Each queue item:
```ts
{
  id: number,          // auto-increment
  table_name: string,  // 'products' | 'sales' | 'customers' | etc.
  operation: string,   // 'insert' | 'update' | 'delete'
  record_id: string,   // uuid of the record
  payload: object,     // full record data
  created_at: Date
}
```

### 5.3 Write Pattern
For every write operation (create/update/delete), follow this exact pattern:
```
1. Write to Dexie immediately → UI updates instantly
2. Add item to sync_queue in Dexie
3. If online → attempt Supabase sync immediately
4. If sync succeeds → remove item from sync_queue
5. If offline or sync fails → leave in queue
```

### 5.4 Sync Worker
Create `lib/sync.ts`:
- `syncNow()` function — drains the sync_queue and pushes to Supabase
- Called on: app mount (if online), and on `window online` event
- Processes queue items in order (FIFO)
- On each item: upsert to Supabase using `record_id` as the conflict key
- On success: delete item from sync_queue
- On failure: leave in queue, log error, continue to next item

### 5.5 Initial Load / Hydration
When the app loads and user is authenticated:
1. Fetch all records from Supabase for the current `business_id`
2. Upsert into local Dexie tables (Supabase wins on conflict — it is the canonical cloud record)
3. After hydration, all operations use Dexie normally

### 5.6 Online/Offline Detection
The Topbar already has an Online/Offline indicator. Wire it to:
- `window.addEventListener('online', syncNow)`
- `window.addEventListener('offline', () => setOnline(false))`
- Show a "Syncing…" state while queue is being drained

---

## 6. Updating Existing Modules for Auth + Sync

Every existing module that reads/writes data needs these changes:

### 6.1 All Data Writes — Add `business_id`
Every record inserted into Dexie and Supabase must include `business_id` from the auth context. No record should ever be written without it.

### 6.2 All Data Reads — Filter by `business_id`
All Dexie queries must be filtered:
```ts
// Example
const products = await db.products
  .where('business_id')
  .equals(currentBusiness.id)
  .toArray()
```

### 6.3 Module-by-Module Checklist

| Module | Changes Needed |
|---|---|
| Dashboard | Filter all queries by `business_id` |
| Inventory | Add `business_id` on product create; filter reads |
| POS / Sales | Add `business_id` + `items` JSONB on sale create |
| Sales Log | Filter by `business_id`; link to Supabase `sales` table |
| Credit Tracker | Add `business_id` on customer + transaction create |
| Statements | Read from Supabase `statements` table; save on generate |
| Settings | Read/write from `businesses` table for current owner |

---

## 7. Supabase Storage (Logo Upload)

- Create a public bucket called `logos` in Supabase Storage
- In onboarding Step 3, upload logo using:
```ts
const { data } = await supabase.storage
  .from('logos')
  .upload(`${business_id}/logo.png`, file)
```
- Save the public URL to `businesses.logo_url`
- Display logo in Topbar and on generated statements

---

## 8. Statement Generation Update

Statements are currently HTML. They should now also:
- Save a record to the Supabase `statements` table when generated
- Pull business name, address, and logo from the `businesses` table
- Include the `business_id` and date range in the saved record
- Be retrievable from the Statements page (load from Supabase if online, Dexie cache if offline)

---

## 9. Implementation Order

Follow this exact sequence to avoid breaking the working frontend:

1. Set up Supabase project + run all SQL schema migrations
2. Create `lib/supabase.ts`
3. Build Auth Context (`lib/auth-context.tsx`)
4. Build `/login`, `/signup`, `/onboarding` pages
5. Add `middleware.ts` for route protection
6. Add `sync_queue` to Dexie schema in `lib/db.ts`
7. Build `lib/sync.ts` (sync worker)
8. Wire `online`/`offline` events to sync worker in layout
9. Update all modules to include `business_id` on writes
10. Update all modules to filter reads by `business_id`
11. Implement initial hydration (Supabase → Dexie on login)
12. Update statement generation to save to Supabase
13. Add logo upload to onboarding + display in app

---

## 10. Out of Scope for This Phase

- Real-time multi-device live sync (Supabase Realtime subscriptions) — v3
- Staff accounts with separate logins — v3
- Automated WhatsApp reminders — v3
- Export to Excel — v3
- Any lender API integrations — v3

---

## 11. Definition of Done

This phase is complete when:
- [ ] A new user can sign up, complete onboarding, and reach the dashboard
- [ ] All data written offline syncs to Supabase when connection is restored
- [ ] Two different accounts cannot see each other's data (RLS verified)
- [ ] Refreshing the page does not lose any data
- [ ] The app is fully usable with no internet connection after first load
- [ ] Generated statements include business name and are saved to Supabase
- [ ] Logo uploaded during onboarding appears in the app header

---

*Feed this document directly to Cursor. Implement in the order specified in Section 9.*