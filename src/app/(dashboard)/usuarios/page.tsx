import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  return <UsersClient currentProfile={profile} profiles={profiles ?? []} />;
}
