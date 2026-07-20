export type CustomerBalance = {
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  total_minutes: number;
  next_expiry: string | null;
  vip_expires_at: string | null;
};

export type BedSession = {
  id: string;
  customer_id: string;
  bed_name: string;
  minutes: number;
  started_at: string;
  ends_at: string;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
};

export type Sale = {
  minutes: number;
  amount: number;
  description: string;
  payment_method?: "card" | "cash";
};
export type Activity = {
  id: string;
  text: string;
  time: string;
};
export type SaleHistory = {
  id: string;
  minutes: number;
  amount: number;
  created_at: string;
};

export type CustomerHistory = {
  lastVisit: BedSession | null;
  purchases: SaleHistory[];
  totalVisits: number;
  totalMinutesPurchased: number;
  totalSpent: number;
};