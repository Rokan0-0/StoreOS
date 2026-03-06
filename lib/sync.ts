import { db } from "./db";
import { supabase } from "./supabase";

let isSyncing = false;

export async function syncNow() {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  isSyncing = true;

  try {
    // 1. Get all pending sync items
    const queue = await db.sync_queue.orderBy('created_at').toArray();
    
    if (queue.length === 0) {
      isSyncing = false;
      return;
    }

    console.log(`Starting sync of ${queue.length} items...`);

    // 2. Process each item sequentially (FIFO)
    for (const item of queue) {
      try {
        if (item.operation === 'insert' || item.operation === 'update') {
          // Upsert to Supabase
          const { error } = await supabase
            .from(item.table_name)
            .upsert(item.payload, { onConflict: 'id' });

          if (error) {
            console.error(`Failed to sync item ${item.id} to ${item.table_name}:`, error);
            // If it's a fatal error (like missing foreign key), we might want to drop it,
            // but for now we leave it in the queue to retry later.
            continue; 
          }
        } else if (item.operation === 'delete') {
          const { error } = await supabase
            .from(item.table_name)
            .delete()
            .eq('id', item.record_id);

          if (error) {
            console.error(`Failed to delete item ${item.record_id} from ${item.table_name}:`, error);
            continue;
          }
        }

        // 3. On success, remove from local queue
        if (item.id) {
          await db.sync_queue.delete(item.id);
        }

      } catch (itemErr) {
        console.error("Error processing sync item:", itemErr);
      }
    }

    console.log("Sync complete.");

  } catch (err) {
    console.error("Fatal error during sync loop:", err);
  } finally {
    isSyncing = false;
  }
}

// Helper function to be called by UI actions
export async function queueLocalMutation(
  tableName: 'products' | 'customers' | 'sales' | 'credit_transactions' | 'statements' | 'restock_logs' | 'businesses',
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  payload: any
) {
  // 1. Add to sync queue locally
  await db.sync_queue.add({
    table_name: tableName,
    operation,
    record_id: recordId,
    payload,
    created_at: new Date()
  });

  // 2. Trigger background sync attempt immediately
  // We don't await this so the UI stays fast
  syncNow();
}

// Called once when a user logs in to fetch all cloud data into local Dexie state
export async function hydrateData(businessId: string) {
  try {
    console.log("Starting data hydration from Supabase...");

    // Fetch all records for this business in parallel
    const [
      { data: products },
      { data: customers },
      { data: sales },
      { data: creditTx },
      { data: statements }
    ] = await Promise.all([
      supabase.from('products').select('*').eq('business_id', businessId),
      supabase.from('customers').select('*').eq('business_id', businessId),
      supabase.from('sales').select('*').eq('business_id', businessId),
      supabase.from('credit_transactions').select('*').eq('business_id', businessId),
      supabase.from('statements').select('*').eq('business_id', businessId)
    ]);

    // Clear existing local data
    await Promise.all([
      db.products.clear(),
      db.customers.clear(),
      db.sales.clear(),
      db.credit_transactions.clear(),
      db.statements.clear()
    ]);

    // Bulk add down from cloud
    const transactions = [];
    if (products?.length) transactions.push(db.products.bulkAdd(products));
    if (customers?.length) transactions.push(db.customers.bulkAdd(customers));
    if (sales?.length) transactions.push(db.sales.bulkAdd(sales));
    if (creditTx?.length) transactions.push(db.credit_transactions.bulkAdd(creditTx));
    if (statements?.length) transactions.push(db.statements.bulkAdd(statements));

    await Promise.all(transactions);

    console.log("Hydration complete!");
  } catch (err) {
    console.error("Failed to hydrate data from Supabase:", err);
  }
}
