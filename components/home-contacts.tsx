"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/supabase/types";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function HomeContacts() {
  const { isAdmin } = useAuth();
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) console.error("Error fetching contacts:", error);
    else setContacts((data as Contact[]) || []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const rows =
    contacts.length > 0
      ? contacts
      : [
        {
          id: "fallback",
          created_at: "",
          updated_at: "",
          name: "AI Office",
          position: null,
          phone: "0987654321",
          email: "ai@winlab.tw",
          sort_order: 0,
        } satisfies Contact,
      ];

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4">
      <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-between">
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">
              聯絡我們
            </h2>
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="h-8 px-3"
              >
                <Link href="/contacts">編輯聯絡資訊</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-8 shrink-0 w-full max-w-md mx-auto lg:mx-0 items-center lg:items-start text-center lg:text-left">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">載入中…</div>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 items-center lg:items-start">
                <div>
                  <p className="text-lg font-semibold">{c.name}</p>
                  {c.position && (
                    <p className="text-muted-foreground">{c.position}</p>
                  )}
                </div>
                {c.phone && (
                  <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <a
                      href={`tel:${c.phone}`}
                      className="hover:text-foreground transition-colors font-mono break-all"
                    >
                      {c.phone}
                    </a>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                    <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <a
                      href={`mailto:${c.email}`}
                      className="hover:text-foreground transition-colors font-mono break-all"
                    >
                      {c.email}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

