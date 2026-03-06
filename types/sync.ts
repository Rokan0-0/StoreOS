export type SyncOperation = 'insert' | 'update' | 'delete';
export type TableName = 'businesses' | 'products' | 'customers' | 'sales' | 'credit_transactions' | 'statements' | 'restock_logs';

export interface SyncQueueItem {
  id?: number;
  table_name: TableName;
  operation: SyncOperation;
  record_id: string; // The UUID of the record
  payload: any;
  created_at: Date;
}
