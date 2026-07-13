"use client";

import { revalidateCarousel } from "@/app/[locale]/carousel/actions";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useT } from "@/lib/i18n/locale-provider";
import type { CarouselSlide } from "@winlab/db";
import { uploadCarouselImage } from "@/lib/upload-image";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { ArrowLeft, Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  initialSlide: CarouselSlide;
}

type ContentLang = "zh" | "en";

export function CarouselEditClient({ id, initialSlide }: Props) {
  const router = useRouter();
  const t = useT();
  const [contentLang, setContentLang] = useState<ContentLang>("zh");

  const {
    data: slide, setData: setSlide, hasChanges,
    isSaving, isDeleting,
    save, remove, guardNavigation,
  } = useContentEditor({
    table: "carousel_slides",
    id,
    initialData: initialSlide,
    fields: ["title", "title_en", "description", "description_en", "link", "image", "sort_order"],
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

  const missingEn =
    !(slide.title_en?.trim()) ||
    // Description is optional in both languages; only flag missing EN when
    // zh has a description but en does not.
    (!!(slide.description?.trim()) && !(slide.description_en?.trim()));

  const titleValue = contentLang === "zh" ? slide.title : (slide.title_en ?? "");
  const descriptionValue =
    contentLang === "zh" ? (slide.description ?? "") : (slide.description_en ?? "");

  return (
    <PageShell tone="editor">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/carousel"))}>
            <ArrowLeft className="w-4 h-4" />
            {t.actions.backToList}
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
              {hasChanges ? t.actions.save : t.editor.status.saved}
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {t.actions.delete}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label={t.carousel.contentLanguage}>
            <button
              type="button"
              role="tab"
              aria-selected={contentLang === "zh"}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                contentLang === "zh"
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setContentLang("zh")}
            >
              {t.carousel.langZh}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={contentLang === "en"}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                contentLang === "en"
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setContentLang("en")}
            >
              {t.carousel.langEn}
            </button>
          </div>
          {missingEn && (
            <Badge variant="secondary">{t.carousel.missingEn}</Badge>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="title">
            {t.common.title}
            {contentLang === "en" ? ` (${t.carousel.langEn})` : ""}
          </Label>
          <Input
            id="title"
            value={titleValue}
            onChange={(e) =>
              setSlide((prev) =>
                contentLang === "zh"
                  ? { ...prev, title: e.target.value }
                  : { ...prev, title_en: e.target.value || null },
              )
            }
            placeholder={
              contentLang === "zh"
                ? t.carousel.titlePlaceholder
                : t.carousel.titlePlaceholderEn
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">
            {t.common.description}
            {contentLang === "en" ? ` (${t.carousel.langEn})` : ""}
          </Label>
          <Input
            id="description"
            value={descriptionValue}
            onChange={(e) =>
              setSlide((prev) =>
                contentLang === "zh"
                  ? { ...prev, description: e.target.value || null }
                  : { ...prev, description_en: e.target.value || null },
              )
            }
            placeholder={
              contentLang === "zh"
                ? t.carousel.descriptionPlaceholder
                : t.carousel.descriptionPlaceholderEn
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="link">{t.common.link}</Label>
          <Input
            id="link"
            type="url"
            value={slide.link ?? ""}
            onChange={(e) => setSlide((prev) => ({ ...prev, link: e.target.value || null }))}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">{t.common.sortOrderHint}</Label>
          <Input
            id="sort_order"
            type="number"
            value={slide.sort_order}
            onChange={(e) => setSlide((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.carousel.imageLabel}</Label>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="relative w-full sm:w-64 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
              <Image
                src={resolveImageSrc(slide.image)}
                alt={slide.title || t.carousel.untitled}
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
                {isUploadingImage ? t.common.uploading : t.actions.uploadImage}
              </Button>
              <p className="text-xs text-muted-foreground">{t.carousel.imageHint}</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
