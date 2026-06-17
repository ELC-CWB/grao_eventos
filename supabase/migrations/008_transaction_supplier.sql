alter table transactions add column if not exists supplier_id uuid references suppliers(id) on delete set null;
