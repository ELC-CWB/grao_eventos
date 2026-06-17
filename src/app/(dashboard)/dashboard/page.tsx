import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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
    if (ids.length === 0) {
      return <DashboardClient profile={profile} events={[]} summaries={{}} />;
    }

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

  const eventList = events ?? [];
  const eventIds = eventList.map((e) => e.id);
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
      events={eventList}
      summaries={summaries}
    />
  );
}
