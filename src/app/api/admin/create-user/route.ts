import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { email, password, full_name, phone } = await request.json();
  const role = "manager"; // novos usuários sempre criados como Apoiador

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Cria o usuário auth passando os metadados para o trigger usar o role correto
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Upsert: o trigger pode já ter criado o perfil com role padrão,
  // então garantimos que os dados corretos (incluindo role) sejam salvos
  const { data: newProfile, error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: authUser.user.id,
      email,
      full_name,
      phone: phone || null,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select()
    .single();

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ profile: newProfile });
}
