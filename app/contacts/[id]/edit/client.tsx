"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/supabase/types";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ArrowLeft, Check, Loader2, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ContactEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [contact, setContact] = useState<Contact | null>(null);
  const [savedContact, setSavedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges =
    contact && savedContact
      ? contact.name !== savedContact.name ||
        (contact.position ?? "") !== (savedContact.position ?? "") ||
        (contact.phone ?? "") !== (savedContact.phone ?? "") ||
        (contact.email ?? "") !== (savedContact.email ?? "") ||
        contact.sort_order !== savedContact.sort_order
      : false;

  useEffect(() => {
    let cancelled = false;

    async function loadContact() {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching contact:", error);
        toast.error("讀取聯絡人失敗，已返回列表");
        router.push("/contacts");
        return;
      }

      if (cancelled) return;

      setContact(data as Contact);
      setSavedContact(data as Contact);
      setIsLoading(false);
    }

    void loadContact();

    return () => {
      cancelled = true;
    };
  }, [id, router, supabase]);

  const handleSave = async () => {
    if (!contact) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({
        name: contact.name,
        position: contact.position || null,
        phone: contact.phone || null,
        email: contact.email || null,
        sort_order: contact.sort_order,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving contact:", error);
      toast.error("儲存聯絡人失敗，請稍後再試");
    } else {
      setSavedContact({ ...contact });
    }
    setIsSaving(false);
  };

  const { guardNavigation } = useAutoSave({ hasChanges, onSave: handleSave });

  const handleDelete = async () => {
    if (!confirm("確定要刪除此聯絡人嗎？")) return;

    setIsDeleting(true);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting contact:", error);
      toast.error("刪除聯絡人失敗，請稍後再試");
      setIsDeleting(false);
      return;
    }
    router.push("/contacts");
  };

  if (isLoading) {
    return (
      <PageShell tone="centeredState">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </PageShell>
    );
  }

  if (!contact) return null;

  return (
    <PageShell tone="admin">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/contacts"))}>
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>

        <div className="flex gap-2">
          <Button
            variant={hasChanges ? "outline" : "ghost"}
            onClick={handleSave}
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

          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
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
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            placeholder="聯絡人姓名"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="position">職位（新增）</Label>
          <Input
            id="position"
            value={contact.position ?? ""}
            onChange={(e) => setContact({ ...contact, position: e.target.value || null })}
            placeholder="例如：行政助理 / 專案經理"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">電話</Label>
          <Input
            id="phone"
            value={contact.phone ?? ""}
            onChange={(e) => setContact({ ...contact, phone: e.target.value || null })}
            placeholder="例如：03-5131867#54832"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">信箱</Label>
          <Input
            id="email"
            type="email"
            value={contact.email ?? ""}
            onChange={(e) => setContact({ ...contact, email: e.target.value || null })}
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
              setContact({ ...contact, sort_order: parseInt(e.target.value, 10) || 0 })
            }
          />
        </div>
      </div>
    </PageShell>
  );
}
