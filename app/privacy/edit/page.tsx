"use client";

import { useAuth } from "@/components/auth-provider";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check, Loader2, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type VersionRecord = {
  id: string;
  version: number;
  content: Record<string, unknown>;
  note: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

export default function PrivacyEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState<Record<string, unknown>>({});
  const [savedContent, setSavedContent] = useState<Record<string, unknown>>({});
  const [note, setNote] = useState("");
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [latestVersion, setLatestVersion] = useState(0);

  const hasChanges = JSON.stringify(content) !== JSON.stringify(savedContent);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("privacy_policy")
      .select("id, version, content, note, created_at, profiles!created_by(display_name)")
      .order("version", { ascending: false });

    if (data && data.length > 0) {
      const typed = data as unknown as VersionRecord[];
      setContent(typed[0].content);
      setSavedContent(typed[0].content);
      setLatestVersion(typed[0].version);
      setVersions(typed);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!authLoading && user && !isAdmin) { router.push("/privacy"); return; }
    if (user) fetchData();
  }, [user, authLoading, isAdmin, fetchData, router]);

  const handleSave = async () => {
    if (!hasChanges || !user) return;
    setIsSaving(true);
    const { error } = await supabase.from("privacy_policy").insert({
      content,
      version: latestVersion + 1,
      note: note.trim() || null,
      created_by: user.id,
    });
    if (!error) {
      setSavedContent({ ...content });
      setNote("");
      await fetchData();
    }
    setIsSaving(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 flex flex-col mt-8 pb-16">
      {/* Sticky toolbar */}
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex items-center justify-between gap-4">
        <Link href="/privacy">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            返回頁面
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="版本備註（選填）"
            className="w-48 h-8 text-sm"
          />
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
            {hasChanges ? "發布新版本" : "已是最新"}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="mt-6">
        <TiptapEditor
          content={content}
          onChange={setContent}
        />
      </div>

      {/* Version history */}
      {versions.length > 0 && (
        <div className="mt-12">
          <h2 className="text-base font-semibold mb-4">版本紀錄</h2>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold w-16">版本</th>
                  <th className="text-left px-4 py-3 font-semibold">發布時間</th>
                  <th className="text-left px-4 py-3 font-semibold">發布者</th>
                  <th className="text-left px-4 py-3 font-semibold">備註</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {versions.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">v{v.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">{v.profiles?.display_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.note || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {v.version === latestVersion ? (
                        <span className="text-xs text-green-600 font-medium px-3">目前版本</span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setContent(v.content)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          載入
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
