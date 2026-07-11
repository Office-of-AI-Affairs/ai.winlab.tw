"use client";

import { revalidateContacts } from "@/app/[locale]/contacts/actions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useT } from "@/lib/i18n/locale-provider";
import type { Contact } from "@winlab/db";
import { ArrowLeft, Check, Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  initialContact: Contact;
}

export function ContactEditClient({ id, initialContact }: Props) {
  const t = useT();
  const router = useRouter();

  const {
    data: contact, setData: setContact, hasChanges,
    isSaving, isDeleting,
    save, remove, guardNavigation,
  } = useContentEditor({
    table: "contacts",
    id,
    initialData: initialContact,
    fields: ["name", "position", "phone", "email", "sort_order"],
    redirectTo: "/contacts",
    publishable: false,
    onAfterSave: revalidateContacts,
    onAfterRemove: revalidateContacts,
  });

  return (
    <PageShell tone="admin">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/contacts"))}>
          <ArrowLeft className="w-4 h-4" />
          {t.actions.back}
        </Button>

        <div className="flex gap-2">
          <Button
            variant={hasChanges ? "outline" : "ghost"}
            onClick={save}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasChanges ? (
              <Save className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4 text-green-600" />
            )}
            {hasChanges ? t.actions.save : t.editor.status.saved}
          </Button>

          <Button variant="destructive" onClick={remove} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t.actions.delete}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="grid gap-2">
          <Label htmlFor="name">{t.common.name}</Label>
          <Input
            id="name"
            value={contact.name}
            onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t.contacts.namePlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="position">{t.contacts.positionLabel}</Label>
          <Input
            id="position"
            value={contact.position ?? ""}
            onChange={(e) => setContact((prev) => ({ ...prev, position: e.target.value || null }))}
            placeholder={t.contacts.positionPlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">{t.common.phone}</Label>
          <Input
            id="phone"
            value={contact.phone ?? ""}
            onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value || null }))}
            placeholder={t.contacts.phonePlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">{t.contacts.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            value={contact.email ?? ""}
            onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value || null }))}
            placeholder="name@nycu.edu.tw"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">{t.common.sortOrderHint}</Label>
          <Input
            id="sort_order"
            type="number"
            value={contact.sort_order}
            onChange={(e) =>
              setContact((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))
            }
          />
        </div>
      </div>
    </PageShell>
  );
}
