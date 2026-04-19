"use client";

import { revalidateIntroduction } from "@/app/introduction/actions";
import { PageShell } from "@/components/page-shell";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentEditor } from "@/hooks/use-content-editor";
import type { Introduction } from "@/lib/supabase/types";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  initialIntroduction: Introduction;
}

export function IntroductionEditClient({ initialIntroduction }: Props) {
  const router = useRouter();

  const {
    data: introduction,
    setData: setIntroduction,
    hasChanges,
    isSaving,
    save,
    guardNavigation,
  } = useContentEditor({
    table: "introduction",
    id: initialIntroduction.id,
    initialData: initialIntroduction,
    fields: ["title", "content"],
    redirectTo: "/introduction",
    publishable: false,
    onAfterSave: revalidateIntroduction,
  });

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
              onClick={save}
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
