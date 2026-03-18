"use client";

import { useAuth } from "@/components/auth-provider";
import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { UsersTable, type UserRow } from "@/components/users-table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const roleLabel: Record<string, string> = {
  admin: "管理員",
  user: "一般用戶",
};

// ── CSV helpers ──────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result.map((s) => s.trim().replace(/^"|"$/g, ""));
}

function parseImportCSV(text: string): { name: string; email: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name");
  const emailIdx = headers.findIndex((h) => h === "email");
  if (emailIdx === -1) return [];
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => {
      const cols = parseCSVLine(l);
      return {
        name: nameIdx !== -1 ? cols[nameIdx] ?? "" : "",
        email: cols[emailIdx] ?? "",
      };
    })
    .filter((u) => u.email);
}

function exportUsersCSV(users: UserRow[]) {
  const headers = ["name", "email", "role", "joined"];
  const rows = users.map((u) => [
    u.display_name ?? "",
    u.email,
    u.role,
    new Date(u.created_at).toISOString().split("T")[0],
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
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
    const rows = parseImportCSV(text);
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
