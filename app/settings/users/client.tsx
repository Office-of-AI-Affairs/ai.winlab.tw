"use client";

import { useRef, useState } from "react";

import { AppLink } from "@/components/app-link";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { PageShell } from "@/components/page-shell";
import { UsersTable } from "@/components/users-table";
import type { UserRow } from "@/components/users-table";
import { createClient } from "@/lib/supabase/client";
import { buildUsersCsv, parseUsersCsv } from "@/lib/users-csv";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function exportUsersCSV(users: UserRow[]) {
  const { csv, filename } = buildUsersCsv(users);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsUsersPageClient({
  initialUsers,
}: {
  initialUsers: UserRow[];
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  async function refreshUsers() {
    const { data } = await supabase.rpc("get_all_users");
    setUsers((data as UserRow[]) ?? []);
  }

  async function handleAddTag(userId: string, tag: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newTags = [...(user.tags ?? []), tag];

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tags: newTags } : u))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ tags: newTags })
      .eq("id", userId);

    if (error) {
      toast.error("標籤新增失敗");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tags: user.tags } : u))
      );
    }
  }

  async function handleRemoveTag(userId: string, tag: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newTags = (user.tags ?? []).filter((t) => t !== tag);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tags: newTags } : u))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ tags: newTags })
      .eq("id", userId);

    if (error) {
      toast.error("標籤移除失敗");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tags: user.tags } : u))
      );
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const text = await file.text();
    const rows = parseUsersCsv(text);
    if (rows.length === 0) {
      toast.error("CSV 格式錯誤或無有效資料。請確認標頭包含 name 和 email 欄位。");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const { data: result, error } = await supabase.functions.invoke("import-users", {
      body: { users: rows },
    });

    if (error) {
      toast.error(error.message ?? "匯入失敗");
    } else {
      setImportResult(result);
      await refreshUsers();
    }
    setIsImporting(false);
  };

  return (
    <PageShell className="block">
      <div className="flex items-center gap-4 mb-8">
        <AppLink
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          系統設定
        </AppLink>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImport}
      />

      <UsersTable
        users={users}
        isImporting={isImporting}
        importResult={importResult}
        onExport={() => exportUsersCSV(users)}
        onImportClick={() => fileInputRef.current?.click()}
        onEditUser={setEditingUser}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />

      <UserEditDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={() => setEditingUser(null)}
        onSaved={refreshUsers}
      />
    </PageShell>
  );
}
