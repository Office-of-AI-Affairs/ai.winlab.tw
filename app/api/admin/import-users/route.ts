import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

function generateStrongPassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = Array.from(randomBytes(24));
  return bytes.map((b) => chars[b % chars.length]).join("");
}

export async function POST(request: Request) {
  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey)
    return NextResponse.json(
      { error: "Server not configured for admin operations (missing SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );

  const body = await request.json();
  const rows: { name: string; email: string }[] = body.users ?? [];

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { name, email } of rows) {
    if (!email) continue;

    const password = generateStrongPassword();
    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { display_name: name?.trim() || null },
    });

    if (error) {
      // 422 = email already registered
      if (
        error.status === 422 ||
        error.message.toLowerCase().includes("already")
      ) {
        skipped++;
      } else {
        errors.push(`${email}: ${error.message}`);
      }
      continue;
    }

    // Ensure profile row exists (in case trigger didn't fire)
    if (data.user) {
      await adminClient.from("profiles").upsert(
        { id: data.user.id, display_name: name?.trim() || null, role: "user" },
        { ignoreDuplicates: true }
      );
    }

    created++;
  }

  return NextResponse.json({ created, skipped, errors });
}
