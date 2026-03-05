"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { CarouselSlide } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function CarouselPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSlides = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("carousel_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) console.error("Error fetching carousel:", error);
    else setSlides((data as CarouselSlide[]) || []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      router.push("/");
      return;
    }
    if (user && isAdmin) fetchSlides();
  }, [authLoading, user, isAdmin, router, fetchSlides]);

  const handleCreate = async () => {
    if (!user || !isAdmin) return;
    setIsCreating(true);
    const { data, error } = await supabase
      .from("carousel_slides")
      .insert({
        title: "新橫幅",
        description: null,
        link: null,
        image: null,
        sort_order: slides.length,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating slide:", error);
      setIsCreating(false);
      return;
    }
    router.push(`/carousel/${data.id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此橫幅嗎？")) return;
    setDeletingId(id);
    const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
    if (error) console.error("Error deleting slide:", error);
    else await fetchSlides();
    setDeletingId(null);
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">首頁橫幅</h1>
          <p className="text-muted-foreground mt-1">管理首頁輪播圖片，可設定標題、描述與連結</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          新增橫幅
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : slides.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>尚無橫幅</CardTitle>
            <CardDescription>新增橫幅後將顯示於首頁輪播</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              新增第一則橫幅
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {slides.map((slide, index) => (
            <Card key={slide.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="relative w-full sm:w-48 aspect-video shrink-0 rounded-md overflow-hidden bg-muted">
                  <Image
                    src={slide.image || "/placeholder.png"}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    unoptimized={isExternalImage(slide.image)}
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <p className="text-sm text-muted-foreground">順序 {index + 1}</p>
                  <h2 className="text-xl font-semibold">{slide.title || "(無標題)"}</h2>
                  {slide.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{slide.description}</p>
                  )}
                  {slide.link && (
                    <p className="text-sm text-primary truncate">{slide.link}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/carousel/${slide.id}/edit`}>
                      <Pencil className="w-4 h-4" />
                      編輯
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(slide.id)}
                    disabled={deletingId === slide.id}
                  >
                    {deletingId === slide.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    刪除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
