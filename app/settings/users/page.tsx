"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

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
    if (user) fetchUsers();
  }, [user, authLoading, isAdmin, fetchUsers, router]);

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
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          系統設定
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">用戶管理</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportUsersCSV(users)}
            disabled={users.length === 0}
          >
            <Download className="w-4 h-4" />
            匯出 CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isImporting ? "匯入中…" : "匯入 CSV"}
          </Button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="mb-8 rounded-xl border bg-muted/40 px-4 py-3 text-sm flex flex-col gap-1">
          <p className="font-medium">
            匯入完成：成功建立 {importResult.created} 位，跳過 {importResult.skipped} 位重複用戶
          </p>
          {importResult.errors.length > 0 && (
            <ul className="text-destructive list-disc list-inside">
              {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <p className="text-muted-foreground text-xs mt-1">
            新用戶需透過「忘記密碼」設定自己的密碼後才能登入。
          </p>
        </div>
      )}

      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-semibold">姓名</th>
              <th className="text-left px-4 py-3 font-semibold">電子信箱</th>
              <th className="text-left px-4 py-3 font-semibold">角色</th>
              <th className="text-left px-4 py-3 font-semibold">加入時間</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  {u.display_name || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      u.role === "admin"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {roleLabel[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("zh-TW", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">尚無用戶資料</div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-right">共 {users.length} 位用戶</p>

      {/* CSV format hint */}
      <div className="mt-8 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">CSV 匯入格式</p>
        <pre className="font-mono leading-relaxed">
          name,email{"\n"}
          張三,zhang3@example.com{"\n"}
          李四,li4@example.com
        </pre>
        <p className="mt-2">僅需 <code className="bg-muted rounded px-1">name</code> 與 <code className="bg-muted rounded px-1">email</code> 欄位。重複 email 自動跳過，新用戶預設為一般用戶，需透過「忘記密碼」設定密碼。</p>
      </div>
    </div>
  );
}
