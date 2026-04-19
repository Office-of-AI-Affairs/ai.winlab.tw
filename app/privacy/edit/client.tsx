"use client";

import { PageShell } from "@/components/page-shell";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/date";
import { ArrowLeft, Check, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useState } from "react";

export type VersionRecord = {
  id: string;
  version: number;
  content: Record<string, unknown>;
  note: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

type Props = {
  initialUserId: string;
  initialVersions: VersionRecord[];
};

export default function PrivacyEditPage({
  initialUserId,
  initialVersions,
}: Props) {
  const supabase = createClient();
  const latestRecord = initialVersions[0] ?? null;

  const [content, setContent] = useState<Record<string, unknown>>(latestRecord?.content ?? {});
  const [savedContent, setSavedContent] = useState<Record<string, unknown>>(latestRecord?.content ?? {});
  const [note, setNote] = useState("");
  const [versions, setVersions] = useState<VersionRecord[]>(initialVersions);
  const [isSaving, setIsSaving] = useState(false);
  const [latestVersion, setLatestVersion] = useState(latestRecord?.version ?? 0);

  const hasChanges = JSON.stringify(content) !== JSON.stringify(savedContent);

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    const { error } = await supabase.from("privacy_policy").insert({
      content: content as never,
      version: latestVersion + 1,
      note: note.trim() || null,
      created_by: initialUserId,
    });
    if (error) {
      toast.error("儲存失敗");
      setIsSaving(false);
      return;
    }
    setSavedContent({ ...content });
    setNote("");
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
    setIsSaving(false);
  };

  return (
    <PageShell tone="editor">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/privacy">
            <ArrowLeft className="w-4 h-4" />
            返回頁面
          </Link>
        </Button>
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

      <div className="mt-6">
        <TiptapEditor
          content={content}
          onChange={setContent}
        />
      </div>

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
                      {formatDate(v.created_at, "long")}
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
    </PageShell>
  );
}
