import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const [{ data: profiles }, { data: events }, { data: eventUsers }] = await Promise.all([
    supabase.from("profiles").select("*").order("role", { ascending: true }).order("full_name"),
    supabase.from("events").select("id, name, start_date, end_date").order("start_date"),
    supabase.from("event_users").select("user_id, event_id"),
  ]);

  const userEventMap: Record<string, string[]> = {};
  for (const eu of eventUsers ?? []) {
    if (!userEventMap[eu.user_id]) userEventMap[eu.user_id] = [];
    userEventMap[eu.user_id].push(eu.event_id);
  }

  return (
    <UsersClient
      currentProfile={profile}
      profiles={profiles ?? []}
      events={events ?? []}
      userEventMap={userEventMap}
    />
  );
}
