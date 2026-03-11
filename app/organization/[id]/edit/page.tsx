"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type {
  OrganizationMember,
  OrganizationMemberCategory,
} from "@/lib/supabase/types";
import { uploadOrganizationImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/use-auto-save";
import { ArrowLeft, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CATEGORIES: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "ai_newcomer", label: "AI新秀" },
  { value: "industry_academy", label: "產學聯盟" },
  { value: "alumni", label: "校友" },
];

export default function OrganizationMemberEditPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [savedMember, setSavedMember] = useState<OrganizationMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    member && savedMember
      ? member.name !== savedMember.name ||
        (member.summary ?? "") !== (savedMember.summary ?? "") ||
        (member.image ?? "") !== (savedMember.image ?? "") ||
        (member.link ?? "") !== (savedMember.link ?? "") ||
        member.category !== savedMember.category ||
        member.sort_order !== savedMember.sort_order
      : false;

  const fetchMember = useCallback(async () => {
    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching organization member:", error);
      router.push("/organization");
      return;
    }

    setMember(data as OrganizationMember);
    setSavedMember(data as OrganizationMember);
    setIsLoading(false);
  }, [supabase, id, router]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/organization");
      return;
    }
    if (isAdmin) {
      fetchMember();
    }
  }, [isAdmin, authLoading, fetchMember, router]);

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("organization_members")
      .update({
        name: member.name,
        summary: member.summary || null,
        image: member.image || null,
        link: member.link || null,
        category: member.category,
        sort_order: member.sort_order,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving organization member:", error);
    } else {
      setSavedMember({ ...member });
    }
    setIsSaving(false);
  };

  useAutoSave({ hasChanges, onSave: handleSave });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    setIsUploadingImage(true);
    const result = await uploadOrganizationImage(file);
    e.target.value = "";

    if ("error" in result) {
      toast.error(result.error);
    } else {
      setMember({ ...member, image: result.url });
    }
    setIsUploadingImage(false);
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除此成員嗎？")) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting organization member:", error);
      setIsDeleting(false);
      return;
    }

    router.push("/organization");
  };

  if (isLoading || !member) {
    return (
      <div className="max-w-6xl mx-auto px-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/organization")}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label>分類</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs md:text-sm"
            value={member.category}
            onChange={(e) =>
              setMember({
                ...member,
                category: e.target.value as OrganizationMemberCategory,
              })
            }
          >
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label>名稱</Label>
          <Input
            value={member.name}
            onChange={(e) => setMember({ ...member, name: e.target.value })}
            placeholder="成員名稱"
          />
        </div>

        <div className="grid gap-2">
          <Label>簡介</Label>
          <Textarea
            className="min-h-[120px] resize-y"
            value={member.summary ?? ""}
            onChange={(e) =>
              setMember({ ...member, summary: e.target.value || null })
            }
            placeholder="簡短介紹"
          />
        </div>

        <div className="grid gap-2">
          <Label>圖片</Label>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-input bg-muted">
              <Image
                src={member.image || "/placeholder.png"}
                alt={member.name}
                fill
                className="object-cover"
                unoptimized={isExternalImage(member.image)}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              上傳圖片
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>連結（選填）</Label>
          <Input
            type="url"
            value={member.link ?? ""}
            onChange={(e) =>
              setMember({ ...member, link: e.target.value || null })
            }
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label>排序（數字越小越前面）</Label>
          <Input
            type="number"
            value={member.sort_order}
            onChange={(e) =>
              setMember({
                ...member,
                sort_order: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            儲存
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
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
  );
}
