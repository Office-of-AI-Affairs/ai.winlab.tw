import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@winlab/db";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export const createClient = () =>
  createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey);
