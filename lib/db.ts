import Dexie, { Table } from "dexie";
import type {
  Business,
  Product,
  Customer,
  Sale,
  CreditTransaction,
  Statement,
  StockRestockLog,
} from "@/types";
import type { SyncQueueItem } from "@/types/sync";

export class StoreOSDatabase extends Dexie {
  businesses!: Table<Business>;
  products!: Table<Product>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  credit_transactions!: Table<CreditTransaction>;
  statements!: Table<Statement>;
  restock_logs!: Table<StockRestockLog>;
  sync_queue!: Table<SyncQueueItem>;

  constructor() {
    super("StoreOSDB");
    this.version(4).stores({
      businesses: "id, owner_id",
      products: "id, business_id, name, category, sell_type, sku, updated_at",
      customers: "id, business_id",
      sales: "id, business_id, customer_id, payment_type, created_at",
      credit_transactions: "id, business_id, customer_id, type, created_at",
      statements: "id, business_id, period_start, type",
      restock_logs: "id, business_id, product_id, created_at",
      sync_queue: "++id, table_name, operation, record_id, created_at",
    }).upgrade(async tx => {
      await tx.table("products").toCollection().modify((product: any) => {
        if (!product.sell_type) product.sell_type = "unit";
        if (!product.unit_label) product.unit_label = "Unit";
        if (!product.pack_label) product.pack_label = "Pack";
      });
    });
  }
}

export const db = new StoreOSDatabase();
