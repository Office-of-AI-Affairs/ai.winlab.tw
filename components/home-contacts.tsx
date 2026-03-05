import { ContactsEditButton } from "@/components/contacts-edit-button";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { Mail, Phone } from "lucide-react";

const FALLBACK_CONTACT: Contact = {
  id: "fallback",
  created_at: "",
  updated_at: "",
  name: "AI Office",
  position: null,
  phone: "0987654321",
  email: "ai@winlab.tw",
  sort_order: 0,
};

export async function HomeContacts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = data && data.length > 0 ? (data as Contact[]) : [FALLBACK_CONTACT];

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4">
      <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-between">
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">聯絡我們</h2>
            <ContactsEditButton />
          </div>
        </div>
        <div className="flex flex-col gap-8 shrink-0 w-full max-w-md mx-auto lg:mx-0 items-center lg:items-start text-center lg:text-left">
          {rows.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 items-center lg:items-start">
              <div>
                <p className="text-lg font-semibold">{c.name}</p>
                {c.position && <p className="text-muted-foreground">{c.position}</p>}
              </div>
              {c.phone && (
                <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                  <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${c.phone}`} className="hover:text-foreground transition-colors font-mono break-all">
                    {c.phone}
                  </a>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                  <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${c.email}`} className="hover:text-foreground transition-colors font-mono break-all">
                    {c.email}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
