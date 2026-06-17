import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ isFirstUser: false });
  }

  const adminClient = createAdminClient(supabaseUrl, serviceKey);
  const { count } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({ isFirstUser: count === 0 });
}
