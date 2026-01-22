"use client";

import { useAuth } from "@/components/auth-provider";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Introduction } from "@/lib/supabase/types";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function IntroductionEditPage() {
  const { user, isLoading: authLoading } = useAuth();
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

  const fetchIntroduction = useCallback(async () => {
    const { data, error } = await supabase
      .from("introduction")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching introduction:", error);
      // If no data exists, create initial record
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
        setIntroduction(newData);
        setSavedIntroduction(newData);
      } else {
        router.push("/introduction");
        return;
      }
    } else {
      setIntroduction(data);
      setSavedIntroduction(data);
    }
    setIsLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchIntroduction();
    }
  }, [user, authLoading, fetchIntroduction, router]);

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

  if (isLoading || authLoading) {
    return (
      <div className="container max-w-5xl mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!introduction) {
    return null;
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 flex flex-col mt-8 pb-16">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/introduction")}>
            <ArrowLeft className="w-4 h-4" />
            返回
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
        onChange={(content) =>
          setIntroduction({ ...introduction, content })
        }
      />
    </div>
  );
}