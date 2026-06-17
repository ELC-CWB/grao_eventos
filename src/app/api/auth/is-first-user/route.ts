import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Sem service role key: assume que não é o primeiro usuário (padrão seguro → apoiador)
    return NextResponse.json({ isFirstUser: false });
  }

  try {
    const adminClient = createAdminClient(supabaseUrl, serviceKey);

    // Verifica auth.users diretamente (independe de RLS na tabela profiles)
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1, page: 1 });
    if (error) return NextResponse.json({ isFirstUser: false });

    const isFirstUser = !data?.users || data.users.length === 0;
    return NextResponse.json({ isFirstUser });
  } catch {
    return NextResponse.json({ isFirstUser: false });
  }
}
