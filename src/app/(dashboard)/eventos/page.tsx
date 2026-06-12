import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  let eventsQuery = supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });

  if (profile.role === "manager") {
    const { data: eventUsers } = await supabase
      .from("event_users").select("event_id").eq("user_id", user.id);
    const ids = eventUsers?.map((eu) => eu.event_id) ?? [];
    if (ids.length > 0) eventsQuery = eventsQuery.in("id", ids);
    else return <EventsClient profile={profile} events={[]} />;
  }

  const { data: events } = await eventsQuery;

  return <EventsClient profile={profile} events={events ?? []} />;
}
