"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentEditor } from "@/hooks/use-content-editor";
import type { Contact } from "@/lib/supabase/types";
import { ArrowLeft, Check, Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  initialContact: Contact;
}

export function ContactEditClient({ id, initialContact }: Props) {
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
  });

  return (
    <PageShell tone="admin">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/contacts"))}>
          <ArrowLeft className="w-4 h-4" />
          返回
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
            {hasChanges ? "儲存" : "已儲存"}
          </Button>

          <Button variant="destructive" onClick={remove} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            刪除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="grid gap-2">
          <Label htmlFor="name">姓名</Label>
          <Input
            id="name"
            value={contact.name}
            onChange={(e) => setContact((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="聯絡人姓名"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="position">職位（新增）</Label>
          <Input
            id="position"
            value={contact.position ?? ""}
            onChange={(e) => setContact((prev) => ({ ...prev, position: e.target.value || null }))}
            placeholder="例如：行政助理 / 專案經理"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">電話</Label>
          <Input
            id="phone"
            value={contact.phone ?? ""}
            onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value || null }))}
            placeholder="例如：03-5131867#54832"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">信箱</Label>
          <Input
            id="email"
            type="email"
            value={contact.email ?? ""}
            onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value || null }))}
            placeholder="name@nycu.edu.tw"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">排序（數字愈小愈前面）</Label>
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
