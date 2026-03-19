"use client";

import { PageShell } from "@/components/page-shell";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Introduction } from "@/lib/supabase/types";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function IntroductionEditPage() {
  const router = useRouter();
  const supabase = createClient();

  const [introduction, setIntroduction] = useState<Introduction | null>(null);
  const [savedIntroduction, setSavedIntroduction] = useState<Introduction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = introduction && savedIntroduction
    ? introduction.title !== savedIntroduction.title ||
    JSON.stringify(introduction.content) !== JSON.stringify(savedIntroduction.content)
    : false;

  useEffect(() => {
    let cancelled = false;

    async function loadIntroduction() {
      const { data, error } = await supabase
        .from("introduction")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching introduction:", error);
        if (error.code === "PGRST116") {
          const { data: newData, error: insertError } = await supabase
            .from("introduction")
            .insert({
              title: "國立陽明交通大學 人工智慧專責辦公室",
              content: {},
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating introduction:", insertError);
            toast.error("建立簡介內容失敗，已返回頁面");
            router.push("/introduction");
            return;
          }

          if (cancelled) return;

          setIntroduction(newData);
          setSavedIntroduction(newData);
          setIsLoading(false);
          return;
        }

        toast.error("讀取簡介內容失敗，已返回頁面");
        router.push("/introduction");
        return;
      }

      if (cancelled) return;

      setIntroduction(data);
      setSavedIntroduction(data);
      setIsLoading(false);
    }

    void loadIntroduction();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSave = async () => {
    if (!introduction) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("introduction")
      .update({
        title: introduction.title,
        content: introduction.content,
      })
      .eq("id", introduction.id);

    if (error) {
      console.error("Error saving introduction:", error);
      toast.error("儲存簡介失敗，請稍後再試");
    } else {
      setSavedIntroduction({ ...introduction });
    }
    setIsSaving(false);
  };

  const { guardNavigation } = useAutoSave({ hasChanges, onSave: handleSave });

  if (isLoading) {
    return (
      <PageShell tone="centeredState">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </PageShell>
    );
  }

  if (!introduction) {
    return null;
  }

  return (
    <PageShell tone="editor">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/introduction"))}>
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
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="title" className="text-sm mx-2">標題</Label>
          <Input
            id="title"
            value={introduction.title}
            onChange={(e) =>
              setIntroduction({ ...introduction, title: e.target.value })
            }
            placeholder="請輸入標題"
          />
        </div>
      </div>

      <TiptapEditor
        content={introduction.content}
        onChange={(content) => setIntroduction({ ...introduction, content })}
      />
    </PageShell>
  );
}
