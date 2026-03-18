"use client";

import { useAuth } from "@/components/auth-provider";
import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { UsersTable, type UserRow } from "@/components/users-table";
import { createClient } from "@/lib/supabase/client";
import { buildUsersCsv, parseUsersCsv } from "@/lib/users-csv";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const roleLabel: Record<string, string> = {
  admin: "管理員",
  user: "一般用戶",
};

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

// ── Component ─────────────────────────────────────────────────

export default function SettingsUsersPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.rpc("get_all_users");
    setUsers((data as UserRow[]) ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!authLoading && user && !isAdmin) { router.push("/"); return; }
    if (!user) return;

    let cancelled = false;

    async function loadUsers() {
      const { data } = await supabase.rpc("get_all_users");
      if (cancelled) return;
      setUsers((data as UserRow[]) ?? []);
      setIsLoading(false);
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, router, supabase, user]);

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
      await fetchUsers();
    }
    setIsImporting(false);
  };

  if (isLoading || authLoading) {
    return (
      <PageShell tone="centeredState">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </PageShell>
    );
  }

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
        roleLabel={roleLabel}
        isImporting={isImporting}
        importResult={importResult}
        onExport={() => exportUsersCSV(users)}
        onImportClick={() => fileInputRef.current?.click()}
      />
    </PageShell>
  );
}
