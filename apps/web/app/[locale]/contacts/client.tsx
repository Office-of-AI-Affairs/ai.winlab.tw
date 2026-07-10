"use client";

import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { revalidateContacts } from "@/app/[locale]/contacts/actions";
import { useT } from "@/lib/i18n/locale-provider";
import { useCrudList } from "@/hooks/use-crud-list";
import type { Contact } from "@winlab/db";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ContactsAdminPageClient({
  initialContacts,
}: {
  initialContacts: Contact[];
}) {
  const router = useRouter();
  const t = useT();
  const { items: contacts, isCreating, deletingId, create, remove } = useCrudList<Contact>({
    table: "contacts",
    orderBy: "sort_order",
    initialItems: initialContacts,
    onCreated: (item) => router.push(`/contacts/${item.id}/edit`),
    onAfterMutation: revalidateContacts,
  });

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <AppLink
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.actions.backHome}
        </AppLink>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.contacts.heading}</h1>
          <p className="text-muted-foreground mt-1">{t.contacts.subtitle}</p>
        </div>
        <Button onClick={() => create({ name: t.contacts.defaultName, sort_order: contacts.length })} disabled={isCreating}>
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t.contacts.addContact}
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.contacts.empty}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {contacts.map((c, index) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <p className="text-sm text-muted-foreground">{t.common.orderLabel.replace("{n}", String(index + 1))}</p>
                  <h2 className="text-xl font-semibold">{c.name || t.contacts.unnamed}</h2>
                  {c.position && <p className="text-sm text-muted-foreground">{c.position}</p>}
                  <div className="text-sm text-muted-foreground flex flex-col gap-0.5 mt-1">
                    {c.phone && <p className="font-mono">{c.phone}</p>}
                    {c.email && <p className="font-mono">{c.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/contacts/${c.id}/edit`}>
                      <Pencil className="w-4 h-4" />
                      {t.actions.edit}
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(c.id)}
                    disabled={deletingId === c.id}
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {t.actions.delete}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
