import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  let events = null;

  if (profile.role === "manager") {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: eventUsers } = await admin
      .from("event_users")
      .select("event_id")
      .eq("user_id", user.id);

    const ids = eventUsers?.map((eu: { event_id: string }) => eu.event_id) ?? [];
    if (ids.length === 0) return <EventsClient profile={profile} events={[]} />;

    const { data } = await admin
      .from("events")
      .select("*")
      .in("id", ids)
      .order("start_date", { ascending: true });
    events = data;
  } else {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });
    events = data;
  }

  return <EventsClient profile={profile} events={events ?? []} />;
}
