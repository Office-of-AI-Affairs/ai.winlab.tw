"use client";

import { AppLink } from "@/components/app-link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCrudList } from "@/hooks/use-crud-list";
import type { CarouselSlide } from "@/lib/supabase/types";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CarouselPageClient({
  initialSlides,
}: {
  initialSlides: CarouselSlide[];
}) {
  const router = useRouter();
  const { items: slides, isCreating, deletingId, create, remove } = useCrudList<CarouselSlide>({
    table: "carousel_slides",
    orderBy: "sort_order",
    initialItems: initialSlides,
    onCreated: (item) => router.push(`/carousel/${item.id}/edit`),
  });

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <AppLink
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </AppLink>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">首頁橫幅</h1>
          <p className="text-muted-foreground mt-1">管理首頁輪播圖片，可設定標題、描述與連結</p>
        </div>
        <Button onClick={() => create({ title: "", sort_order: slides.length })} disabled={isCreating}>
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          新增橫幅
        </Button>
      </div>

      {slides.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">尚無橫幅</div>
      ) : (
        <div className="flex flex-col gap-4">
          {slides.map((slide, index) => (
            <Card key={slide.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="relative w-full sm:w-48 aspect-video shrink-0 rounded-md overflow-hidden bg-muted">
                  <Image
                    src={resolveImageSrc(slide.image)}
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
                    onClick={() => remove(slide.id)}
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
    </PageShell>
  );
}
