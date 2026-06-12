import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SuppliersClient } from "./suppliers-client";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return <SuppliersClient profile={profile} suppliers={suppliers ?? []} />;
}
