import IntroductionEditPageClient from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function IntroductionEditPage() {
  await requireAdminServer();
  return <IntroductionEditPageClient />;
}
