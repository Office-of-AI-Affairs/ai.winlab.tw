"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Recruitment, RecruitmentPosition } from "@/lib/supabase/types";
import { uploadRecruitmentImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import { toast } from "sonner";
import { ArrowLeft, Check, ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function EventRecruitmentEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const supabase = createClient();

  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [savedRecruitment, setSavedRecruitment] = useState<Recruitment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    recruitment && savedRecruitment
      ? recruitment.title !== savedRecruitment.title ||
        recruitment.link !== savedRecruitment.link ||
        (recruitment.image ?? "") !== (savedRecruitment.image ?? "") ||
        (recruitment.description ?? "") !== (savedRecruitment.description ?? "") ||
        JSON.stringify(recruitment.positions ?? []) !== JSON.stringify(savedRecruitment.positions ?? [])
      : false;

  const fetchRecruitment = useCallback(async () => {
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) { router.push(`/events/${slug}/edit`); return; }
    setRecruitment(data);
    setSavedRecruitment(data);
    setIsLoading(false);
  }, [supabase, id, slug, router]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!authLoading && user && !isAdmin) { router.push(`/events/${slug}?tab=recruitment`); return; }
    if (user && isAdmin) fetchRecruitment();
  }, [user, isAdmin, authLoading, fetchRecruitment, router, slug]);

  const handleSave = async () => {
    if (!recruitment) return;
    setIsSaving(true);
    const { error } = await supabase.from("competitions").update({
      title: recruitment.title,
      link: recruitment.link,
      image: recruitment.image ?? null,
      description: recruitment.description ?? null,
      positions: recruitment.positions?.length ? recruitment.positions : null,
    }).eq("id", id);
    if (!error) setSavedRecruitment({ ...recruitment });
    setIsSaving(false);
  };

  useAutoSave({ hasChanges, onSave: handleSave });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recruitment) return;
    setIsUploadingImage(true);
    const result = await uploadRecruitmentImage(file);
    e.target.value = "";
    if ("error" in result) { toast.error(result.error); }
    else { setRecruitment({ ...recruitment, image: result.url }); }
    setIsUploadingImage(false);
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這則徵才資訊嗎？")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("competitions").delete().eq("id", id);
    if (error) { setIsDeleting(false); return; }
    router.push(`/events/${slug}?tab=recruitment`);
  };

  const positions = recruitment?.positions ?? [];
  const setPositions = (pos: RecruitmentPosition[]) => {
    if (!recruitment) return;
    setRecruitment({ ...recruitment, positions: pos });
  };
  const addPosition = () => setPositions([...positions, { name: "", count: 1, location: null }]);
  const updatePosition = (idx: number, field: keyof RecruitmentPosition, value: string | number | null) =>
    setPositions(positions.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  const removePosition = (idx: number) => setPositions(positions.filter((_, i) => i !== idx));

  if (isLoading || authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!recruitment) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 flex flex-col mt-8 pb-16">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/events/${slug}?tab=recruitment`)}>
            <ArrowLeft className="w-4 h-4" />
            返回活動
          </Button>
          <div className="flex gap-2">
            <Button variant={hasChanges ? "outline" : "ghost"} onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasChanges ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-600" />}
              {hasChanges ? "儲存" : "已儲存"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              刪除
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-1">
          <Label className="text-sm mx-2">封面圖片</Label>
          <div className="flex items-start gap-4">
            <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
              <Image src={recruitment.image || "/placeholder.png"} alt={recruitment.title} fill className="object-cover"
                unoptimized={isExternalImage(recruitment.image)} />
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
              <Button type="button" variant="outline" size="sm" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {isUploadingImage ? "上傳中…" : "上傳圖片"}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG、PNG、GIF、WebP，最大 5MB</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="title" className="text-sm mx-2">標題</Label>
            <Input id="title" value={recruitment.title}
              onChange={(e) => setRecruitment({ ...recruitment, title: e.target.value })}
              placeholder="請輸入標題" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="link" className="text-sm mx-2">連結</Label>
            <Input id="link" type="url" value={recruitment.link}
              onChange={(e) => setRecruitment({ ...recruitment, link: e.target.value })}
              placeholder="https://..." />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="description" className="text-sm mx-2">簡介</Label>
          <Textarea
            id="description"
            className="min-h-[100px] resize-y"
            value={recruitment.description ?? ""}
            onChange={(e) => setRecruitment({ ...recruitment, description: e.target.value || null })}
            placeholder="公司或職缺簡介（選填）"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm mx-2">職缺</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addPosition}>
              <Plus className="w-4 h-4" />
              新增職缺
            </Button>
          </div>
          {positions.length === 0 && (
            <p className="text-sm text-muted-foreground mx-2">尚未新增職缺</p>
          )}
          <div className="flex flex-col gap-2">
            {positions.map((pos, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input value={pos.name} onChange={(e) => updatePosition(idx, "name", e.target.value)} placeholder="職缺名稱" className="flex-1" />
                <Input value={pos.location ?? ""} onChange={(e) => updatePosition(idx, "location", e.target.value || null)} placeholder="地區" className="w-32" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    inputMode="numeric"
                    value={pos.count}
                    onChange={(e) => { const v = parseInt(e.target.value); updatePosition(idx, "count", isNaN(v) || v < 1 ? 1 : v); }}
                    className="w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm text-muted-foreground">名</span>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePosition(idx)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
