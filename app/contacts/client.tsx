"use client";

import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrudList } from "@/hooks/use-crud-list";
import type { Contact } from "@/lib/supabase/types";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ContactsAdminPageClient({
  initialContacts,
}: {
  initialContacts: Contact[];
}) {
  const router = useRouter();
  const { items: contacts, isCreating, deletingId, create, remove } = useCrudList<Contact>({
    table: "contacts",
    orderBy: "sort_order",
    initialItems: initialContacts,
    onCreated: (item) => router.push(`/contacts/${item.id}/edit`),
  });

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <AppLink
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </AppLink>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">聯絡資訊</h1>
          <p className="text-muted-foreground mt-1">管理首頁「聯絡我們」區塊的聯絡人、職位、電話與信箱</p>
        </div>
        <Button onClick={() => create({ name: "新聯絡人", sort_order: contacts.length })} disabled={isCreating}>
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          新增聯絡人
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>尚無聯絡人</CardTitle>
            <CardDescription>新增後會顯示在首頁「聯絡我們」區塊</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => create({ name: "新聯絡人", sort_order: contacts.length })} disabled={isCreating}>
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
                    onClick={() => remove(c.id)}
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
    </PageShell>
  );
}
