"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

function generateStrongPassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = Array.from(randomBytes(24));
  return bytes.map((b) => chars[b % chars.length]).join("");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  return user;
}

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createUser(
  name: string,
  email: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  if (!email?.trim()) return { success: false, error: "Email is required" };

  const adminClient = getAdminClient();
  const password = generateStrongPassword();

  const { data, error } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: name?.trim() || null },
  });

  if (error) return { success: false, error: error.message };

  if (data.user) {
    await adminClient.from("profiles").upsert(
      { id: data.user.id, display_name: name?.trim() || null, role: role || "user" },
      { ignoreDuplicates: true }
    );

    if (role && role !== "user") {
      await adminClient
        .from("profiles")
        .update({ role })
        .eq("id", data.user.id);
    }
  }

  return { success: true };
}

export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  let currentUser;
  try {
    currentUser = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  if (!userId) return { success: false, error: "userId is required" };
  if (userId === currentUser.id)
    return { success: false, error: "不能刪除自己的帳號" };

  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };

  return { success: true };
}
