"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/supabase/types";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ContactsAdminPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      router.push("/");
      return;
    }
    if (user && isAdmin) fetchContacts();
  }, [authLoading, user, isAdmin, router, fetchContacts]);

  const handleCreate = async () => {
    if (!user || !isAdmin) return;
    setIsCreating(true);
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name: "新聯絡人",
        position: "職位（可填可不填）",
        phone: null,
        email: null,
        sort_order: contacts.length,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating contact:", error);
      setIsCreating(false);
      return;
    }
    router.push(`/contacts/${data.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此聯絡人嗎？")) return;
    setDeletingId(id);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) console.error("Error deleting contact:", error);
    else await fetchContacts();
    setDeletingId(null);
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">聯絡資訊</h1>
          <p className="text-muted-foreground mt-1">管理首頁「聯絡我們」區塊的聯絡人、職位、電話與信箱</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          新增聯絡人
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>尚無聯絡人</CardTitle>
            <CardDescription>新增後會顯示在首頁「聯絡我們」區塊</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              新增第一位聯絡人
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {contacts.map((c, index) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <p className="text-sm text-muted-foreground">順序 {index + 1}</p>
                  <h2 className="text-xl font-semibold">{c.name || "(未命名)"}</h2>
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
                      編輯
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    刪除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

