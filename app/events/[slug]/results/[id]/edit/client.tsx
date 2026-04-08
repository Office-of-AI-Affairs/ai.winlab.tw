"use client";

import { CoauthorEditor } from "@/components/coauthor-editor";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicProfile, Result } from "@/lib/supabase/types";
import { uploadResultImage } from "@/lib/upload-image";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useImageUpload } from "@/hooks/use-image-upload";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  slug: string;
  initialResult: Result;
  initialCoauthors: PublicProfile[];
};

export default function EventResultEditPage({
  id,
  slug,
  initialResult,
  initialCoauthors,
}: Props) {
  const router = useRouter();

  const {
    data: result, setData: setResult, hasChanges,
    isSaving, isPublishing, isDeleting,
    save, publish, remove, guardNavigation,
  } = useContentEditor({
    table: "results",
    id,
    initialData: initialResult,
    fields: ["title", "summary", "header_image", "content"],
    redirectTo: `/events/${slug}?tab=results`,
  });

  const { isUploading: isUploadingImage, fileInputRef, triggerFileInput, handleFileChange } = useImageUpload(uploadResultImage);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(e);
    if (url) setResult((prev) => ({ ...prev, header_image: url }));
  };

  return (
    <div className="container max-w-6xl mx-auto p-4 flex flex-col mt-8 pb-16">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push(`/events/${slug}?tab=results`))}>
            <ArrowLeft className="w-4 h-4" />
            返回活動
          </Button>
          <div className="flex gap-2">
            <Button variant={hasChanges ? "outline" : "ghost"} onClick={save} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasChanges ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-600" />}
              {hasChanges ? "儲存" : "已儲存"}
            </Button>
            <Button variant={result.status === "published" ? "secondary" : "default"} onClick={publish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {result.status === "published" ? "取消發布" : "發布"}
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              刪除
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-sm mx-2">封面圖片</Label>
          <div className="flex items-start gap-4">
            <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
              <Image src={resolveImageSrc(result.header_image)} alt={result.title} fill className="object-cover"
                unoptimized={isExternalImage(result.header_image)} />
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onImageChange} />
              <Button type="button" variant="outline" size="sm" disabled={isUploadingImage} onClick={triggerFileInput}>
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {isUploadingImage ? "上傳中…" : "上傳圖片"}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG、PNG、GIF、WebP，最大 5MB</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="title" className="text-sm mx-2">標題</Label>
          <Input id="title" value={result.title} onChange={(e) => setResult((prev) => ({ ...prev, title: e.target.value }))} placeholder="請輸入成果標題" />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="summary" className="text-sm mx-2">摘要（卡片用，選填）</Label>
          <Input id="summary" value={result.summary} onChange={(e) => setResult((prev) => ({ ...prev, summary: e.target.value }))} placeholder="簡短描述，顯示於列表卡片" />
        </div>

        <CoauthorEditor
          resultId={id}
          authorId={initialResult.author_id}
          initialCoauthors={initialCoauthors}
        />

      </div>

      <TiptapEditor content={result.content} onChange={(content) => setResult((prev) => ({ ...prev, content }))} />
    </div>
  );
}
