"use client";

import { IntroductionDetail } from "@/components/introduction-detail";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/components/auth-provider";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Introduction } from "@/lib/supabase/types";
import TiptapImage from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function IntroductionEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [introduction, setIntroduction] = useState<Introduction | null>(null);
  const [savedIntroduction, setSavedIntroduction] = useState<Introduction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const hasChanges = introduction && savedIntroduction
    ? introduction.title !== savedIntroduction.title ||
    JSON.stringify(introduction.content) !== JSON.stringify(savedIntroduction.content)
    : false;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      router.push("/introduction");
      return;
    }
    if (!(user && isAdmin)) return;

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
            router.push("/introduction");
            return;
          }

          if (cancelled) return;

          setIntroduction(newData);
          setSavedIntroduction(newData);
          setIsLoading(false);
          return;
        }

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
  }, [authLoading, isAdmin, router, supabase, user]);

  const introductionContent = introduction?.content;

  const previewContentHtml = useMemo(
    () =>
      introductionContent && Object.keys(introductionContent).length > 0
        ? generateHTML(introductionContent, [
            StarterKit,
            TiptapImage.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
          ])
        : "",
    [introductionContent]
  );

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
    } else {
      setSavedIntroduction({ ...introduction });
    }
    setIsSaving(false);
  };

  const { guardNavigation } = useAutoSave({ hasChanges, onSave: handleSave });

  if (isLoading || authLoading) {
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
            <Button variant={isPreview ? "secondary" : "ghost"} size="sm" onClick={() => setIsPreview(v => !v)}>
              {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isPreview ? "編輯" : "預覽"}
            </Button>
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

        {!isPreview && <div className="flex flex-col gap-1">
          <Label htmlFor="title" className="text-sm mx-2">標題</Label>
          <Input
            id="title"
            value={introduction.title}
            onChange={(e) =>
              setIntroduction({ ...introduction, title: e.target.value })
            }
            placeholder="請輸入標題"
          />
        </div>}
      </div>

      {isPreview ? (
        <div className="py-12">
          <IntroductionDetail
            title={introduction.title}
            contentHtml={previewContentHtml}
          />
        </div>
      ) : (
        <TiptapEditor
          content={introduction.content}
          onChange={(content) => setIntroduction({ ...introduction, content })}
        />
      )}
    </PageShell>
  );
}
