"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/supabase/types";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ArrowLeft, Check, Loader2, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ContactEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
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

  const fetchContact = useCallback(async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching contact:", error);
      router.push("/contacts");
      return;
    }

    setContact(data as Contact);
    setSavedContact(data as Contact);
    setIsLoading(false);
  }, [supabase, id, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      router.push("/");
      return;
    }
    if (user && isAdmin) fetchContact();
  }, [authLoading, user, isAdmin, fetchContact, router]);

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
    } else {
      setSavedContact({ ...contact });
    }
    setIsSaving(false);
  };

  useAutoSave({ hasChanges, onSave: handleSave });

  const handleDelete = async () => {
    if (!confirm("確定要刪除此聯絡人嗎？")) return;

    setIsDeleting(true);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      console.error("Error deleting contact:", error);
      setIsDeleting(false);
      return;
    }
    router.push("/contacts");
  };

  if (isLoading || authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/contacts")}>
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
    </div>
  );
}

