"use client";

import { revalidateCarousel } from "@/app/carousel/actions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useImageUpload } from "@/hooks/use-image-upload";
import type { CarouselSlide } from "@/lib/supabase/types";
import { uploadCarouselImage } from "@/lib/upload-image";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { ArrowLeft, Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  initialSlide: CarouselSlide;
}

export function CarouselEditClient({ id, initialSlide }: Props) {
  const router = useRouter();

  const {
    data: slide, setData: setSlide, hasChanges,
    isSaving, isDeleting,
    save, remove, guardNavigation,
  } = useContentEditor({
    table: "carousel_slides",
    id,
    initialData: initialSlide,
    fields: ["title", "description", "link", "image", "sort_order"],
    redirectTo: "/carousel",
    publishable: false,
    onAfterSave: revalidateCarousel,
    onAfterRemove: revalidateCarousel,
  });

  const { isUploading: isUploadingImage, fileInputRef, triggerFileInput, handleFileChange } = useImageUpload(uploadCarouselImage);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(e);
    if (url) setSlide((prev) => ({ ...prev, image: url }));
  };

  return (
    <PageShell tone="editor">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/carousel"))}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
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
            <Button variant="destructive" onClick={remove} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              刪除
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="grid gap-2">
          <Label htmlFor="title">標題</Label>
          <Input
            id="title"
            value={slide.title}
            onChange={(e) => setSlide((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="橫幅主標題"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">描述</Label>
          <Input
            id="description"
            value={slide.description ?? ""}
            onChange={(e) => setSlide((prev) => ({ ...prev, description: e.target.value || null }))}
            placeholder="副標或說明文字"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="link">連結</Label>
          <Input
            id="link"
            type="url"
            value={slide.link ?? ""}
            onChange={(e) => setSlide((prev) => ({ ...prev, link: e.target.value || null }))}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">排序（數字愈小愈前面）</Label>
          <Input
            id="sort_order"
            type="number"
            value={slide.sort_order}
            onChange={(e) => setSlide((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
          />
        </div>

        <div className="grid gap-2">
          <Label>橫幅圖片</Label>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="relative w-full sm:w-64 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
              <Image
                src={resolveImageSrc(slide.image)}
                alt={slide.title}
                fill
                className="object-cover"
                unoptimized={isExternalImage(slide.image)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onImageChange}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={triggerFileInput}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                {isUploadingImage ? "上傳中…" : "上傳圖片"}
              </Button>
              <p className="text-xs text-muted-foreground">建議比例 16:9，JPEG/PNG/WebP/GIF，最大 5MB</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
