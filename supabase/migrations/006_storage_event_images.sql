-- Create public bucket for event images
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "auth users can upload event images"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-images');

-- Public read
create policy "event images are public"
on storage.objects for select to public
using (bucket_id = 'event-images');

-- Owners can update / delete
create policy "auth users can update event images"
on storage.objects for update to authenticated
using (bucket_id = 'event-images');

create policy "auth users can delete event images"
on storage.objects for delete to authenticated
using (bucket_id = 'event-images');
