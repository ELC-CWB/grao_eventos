import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { EventDetailClient } from "./event-detail-client";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  // Usa admin client se disponível (bypassa RLS), caso contrário usa cliente autenticado normal
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbClient = (supabaseUrl && serviceKey)
    ? createAdminClient(supabaseUrl, serviceKey)
    : supabase;

  const { data: event } = await dbClient.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  // Verifica acesso para gerentes
  if (profile.role === "manager") {
    const { data: access } = await dbClient
      .from("event_users")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .single();
    if (!access) redirect("/eventos");
  }

  const [{ data: transactions }, { data: categories }, { data: responsiblePersons }, { data: suppliers }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*, category:categories(*), responsible_person:responsible_persons(*), supplier:suppliers(*), created_by_profile:profiles!created_by(*)")
        .eq("event_id", id)
        .order("date", { ascending: false }),
      supabase.from("categories").select("*").eq("event_id", id).order("name"),
      supabase.from("responsible_persons").select("*").eq("event_id", id).order("name"),
      supabase.from("suppliers").select("*").order("name"),
    ]);

  // Event users (for admin to manage)
  const { data: eventUsers } = await supabase
    .from("event_users")
    .select("*, profile:profiles(*)")
    .eq("event_id", id);

  const { data: allProfiles } = profile.role === "admin"
    ? await supabase.from("profiles").select("*").order("full_name")
    : { data: null };

  return (
    <EventDetailClient
      profile={profile}
      event={event}
      transactions={transactions ?? []}
      categories={categories ?? []}
      responsiblePersons={responsiblePersons ?? []}
      suppliers={suppliers ?? []}
      eventUsers={eventUsers ?? []}
      allProfiles={allProfiles ?? []}
    />
  );
}
