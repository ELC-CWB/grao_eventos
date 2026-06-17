import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const BUCKET = "event-images";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const eventId = formData.get("eventId") as string | null;

  if (!file || !eventId) {
    return NextResponse.json({ error: "Arquivo ou evento inválido" }, { status: 400 });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Cria o bucket se não existir
  const { data: buckets } = await adminClient.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);

  if (!bucketExists) {
    const { error: bucketError } = await adminClient.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/*"],
      fileSizeLimit: 5242880, // 5 MB
    });
    if (bucketError) {
      return NextResponse.json({ error: bucketError.message }, { status: 500 });
    }
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `events/${eventId}/cover.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(path);

  const { error: updateError } = await adminClient
    .from("events")
    .update({ image_url: publicUrl })
    .eq("id", eventId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ publicUrl });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { eventId } = await request.json();
  if (!eventId) return NextResponse.json({ error: "Evento inválido" }, { status: 400 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("events")
    .update({ image_url: null })
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
