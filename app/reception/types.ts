export type CustomerBalance = {
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  total_minutes: number;
  next_expiry: string | null;
};

export type BedSession = {
  id: string;
  customer_id: string;
  bed_name: string;
  minutes: number;
  started_at: string;
  ends_at: string;
  status: string;
};