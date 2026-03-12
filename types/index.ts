export interface Business {
  id: string;
  owner_id: string;
  name: string;
  type: "Supermarket" | "Provision Store" | "General Store" | "Pharmacy" | "Other";
  address: string;
  phone: string;
  logo_url?: string;
  currency: string;
  low_stock_threshold: number;
  created_at?: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  threshold: number;
  sell_type: "unit" | "pack" | "both";
  pack_size?: number | null;
  pack_label?: string | null;
  unit_label?: string | null;
  sell_price_pack?: number | null;
  image_url?: string;
  sku?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  created_at?: string;
}

export type PaymentType = "Cash" | "Transfer" | "Credit";

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  business_id: string;
  items: SaleItem[];
  total: number;
  payment_type: PaymentType;
  customer_id?: string;
  customer_name?: string;
  staff_name?: string;
  created_at?: string;
  voided?: boolean;
}

export interface CreditTransaction {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  type: "debit" | "repayment" | "credit";
  note?: string;
  sale_id?: string;
  created_at?: string;
}

export interface Statement {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  type: "daily" | "monthly";
  data_json: any;
  created_at?: string;
}

export interface StockRestockLog {
  id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  quantity_added: number;
  supplier?: string;
  note?: string;
  created_at?: string;
}
