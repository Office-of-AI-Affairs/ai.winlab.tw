"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { CarouselSlide } from "@/lib/supabase/types";
import { uploadCarouselImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ArrowLeft, Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function CarouselEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [slide, setSlide] = useState<CarouselSlide | null>(null);
  const [savedSlide, setSavedSlide] = useState<CarouselSlide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    slide && savedSlide
      ? slide.title !== savedSlide.title ||
        (slide.description ?? "") !== (savedSlide.description ?? "") ||
        (slide.link ?? "") !== (savedSlide.link ?? "") ||
        (slide.image ?? "") !== (savedSlide.image ?? "") ||
        slide.sort_order !== savedSlide.sort_order
      : false;

  const fetchSlide = useCallback(async () => {
    const { data, error } = await supabase
      .from("carousel_slides")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching carousel slide:", error);
      router.push("/carousel");
      return;
    }

    setSlide(data as CarouselSlide);
    setSavedSlide(data as CarouselSlide);
    setIsLoading(false);
  }, [supabase, id, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      router.push("/");
      return;
    }
    if (user && isAdmin) fetchSlide();
  }, [user, authLoading, isAdmin, fetchSlide, router]);

  const handleSave = async () => {
    if (!slide) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("carousel_slides")
      .update({
        title: slide.title,
        description: slide.description || null,
        link: slide.link || null,
        image: slide.image || null,
        sort_order: slide.sort_order,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving carousel slide:", error);
    } else {
      setSavedSlide({ ...slide });
    }
    setIsSaving(false);
  };

  useAutoSave({ hasChanges, onSave: handleSave });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slide) return;

    setIsUploadingImage(true);
    const result = await uploadCarouselImage(file);
    e.target.value = "";

    if ("error" in result) {
      toast.error(result.error);
    } else {
      setSlide({ ...slide, image: result.url });
    }
    setIsUploadingImage(false);
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除此橫幅嗎？")) return;

    setIsDeleting(true);
    const { error } = await supabase.from("carousel_slides").delete().eq("id", id);

    if (error) {
      console.error("Error deleting slide:", error);
      setIsDeleting(false);
      return;
    }

    router.push("/carousel");
  };

  if (isLoading || authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!slide) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 flex flex-col mt-8 pb-16">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/carousel")}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
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
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
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
            onChange={(e) => setSlide({ ...slide, title: e.target.value })}
            placeholder="橫幅主標題"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">描述</Label>
          <Input
            id="description"
            value={slide.description ?? ""}
            onChange={(e) => setSlide({ ...slide, description: e.target.value || null })}
            placeholder="副標或說明文字"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="link">連結</Label>
          <Input
            id="link"
            type="url"
            value={slide.link ?? ""}
            onChange={(e) => setSlide({ ...slide, link: e.target.value || null })}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort_order">排序（數字愈小愈前面）</Label>
          <Input
            id="sort_order"
            type="number"
            value={slide.sort_order}
            onChange={(e) => setSlide({ ...slide, sort_order: parseInt(e.target.value, 10) || 0 })}
          />
        </div>

        <div className="grid gap-2">
          <Label>橫幅圖片</Label>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="relative w-full sm:w-64 aspect-video rounded-md overflow-hidden bg-muted shrink-0">
              <Image
                src={slide.image || "/placeholder.png"}
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
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
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
    </div>
  );
}
