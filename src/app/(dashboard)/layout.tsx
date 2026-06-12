export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Sidebar } from "@/components/layout/sidebar";
import type { Profile } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 flex flex-col min-w-0 lg:pl-0 pt-14 lg:pt-0">
        <div className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
