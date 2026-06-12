export type UserRole = "admin" | "manager";
export type EventStatus = "upcoming" | "ongoing" | "completed";
export type TransactionType = "revenue" | "expense";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
  color?: string;
  location?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventUser {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
  event?: Event;
}

export interface Category {
  id: string;
  event_id: string;
  name: string;
  type: TransactionType;
  created_at: string;
}

export interface ResponsiblePerson {
  id: string;
  event_id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  event_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category_id?: string;
  responsible_person_id?: string;
  date: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  responsible_person?: ResponsiblePerson;
  created_by_profile?: Profile;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  category?: string;
  address?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventSummary {
  event_id: string;
  total_revenue: number;
  total_expense: number;
  profit: number;
  transaction_count: number;
}
