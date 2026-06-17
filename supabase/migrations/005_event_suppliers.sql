create table if not exists event_suppliers (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, supplier_id)
);

alter table event_suppliers enable row level security;

create policy "Authenticated users can view event_suppliers"
  on event_suppliers for select using (auth.uid() is not null);

create policy "Authenticated users can insert event_suppliers"
  on event_suppliers for insert with check (auth.uid() is not null);

create policy "Admins can delete event_suppliers"
  on event_suppliers for delete using (get_user_role(auth.uid()) = 'admin');

create index idx_event_suppliers_supplier_id on event_suppliers(supplier_id);
create index idx_event_suppliers_event_id on event_suppliers(event_id);
