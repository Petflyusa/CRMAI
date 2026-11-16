import type { Currency, FxSnapshot } from "./currency";

export type Store = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_currency: Currency;
  cost: number;
  cost_currency: Currency;
  duration_days: number;
  active: boolean;
  created_at: string;
};

export type Member = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  notes: string | null;
  im: string | null;
  initial_password: string | null;
  created_at: string;
};

export type Subscription = {
  id: string;
  member_id: string;
  service_id: string | null;
  store_id: string | null;
  kind: "new" | "renewal";
  start_date: string;
  end_date: string;
  paid_at: string;
  paid_amount: number;
  paid_currency: Currency;
  paid_usd: number;
  cost_usd: number;
  list_price_usd: number | null;
  profit_usd: number;
  fx_snapshot: FxSnapshot;
  notes: string | null;
  created_at: string;
};

export type MemberOverview = Member & {
  subscription_id: string | null;
  subscription_kind: "new" | "renewal" | null;
  service_id: string | null;
  service_name: string | null;
  store_id: string | null;
  store_name: string | null;
  store_code: string | null;
  first_paid_amount: number | null;
  first_paid_currency: Currency | null;
  first_paid_usd: number | null;
  renewal_amount: number | null;
  renewal_currency: Currency | null;
  renewal_usd: number | null;
  renewed_at: string | null;
  renewal_count: number;
  start_date: string | null;
  end_date: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  paid_currency: Currency | null;
  paid_usd: number | null;
  cost_usd: number | null;
  profit_usd: number | null;
  subscription_count: number;
  total_paid_usd: number;
  total_profit_usd: number;
};

export type ActionState = { error?: string; ok?: string } | undefined;
