import { redirect } from "next/navigation";

// Password resets use an 8-digit mailed code on /forgot-password. Old
// reset links from Supabase mails land here and continue there.
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}
