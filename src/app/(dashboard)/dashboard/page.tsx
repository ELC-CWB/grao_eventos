import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch events based on role
  let eventsQuery = supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });

  if (profile.role === "manager") {
    const { data: eventUsers } = await supabase
      .from("event_users")
      .select("event_id")
      .eq("user_id", user.id);
    const eventIds = eventUsers?.map((eu) => eu.event_id) ?? [];
    if (eventIds.length > 0) {
      eventsQuery = eventsQuery.in("id", eventIds);
    } else {
      return <DashboardClient profile={profile} events={[]} summaries={{}} />;
    }
  }

  const { data: events } = await eventsQuery;

  // Fetch transaction summaries per event
  const eventIds = (events ?? []).map((e) => e.id);
  const summaries: Record<string, { revenue: number; expense: number }> = {};

  if (eventIds.length > 0) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("event_id, type, amount")
      .in("event_id", eventIds);

    for (const t of transactions ?? []) {
      if (!summaries[t.event_id]) summaries[t.event_id] = { revenue: 0, expense: 0 };
      if (t.type === "revenue") summaries[t.event_id].revenue += Number(t.amount);
      else summaries[t.event_id].expense += Number(t.amount);
    }
  }

  return (
    <DashboardClient
      profile={profile}
      events={events ?? []}
      summaries={summaries}
    />
  );
}
