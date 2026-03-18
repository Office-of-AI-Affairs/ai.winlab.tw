"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { uploadOrganizationImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "core", label: "核心成員" },
  { value: "legal_entity", label: "法人" },
  { value: "industry", label: "產業" },
];

type FormData = {
  name: string;
  member_role: string;
  school: string;
  research_areas: string;
  email: string;
  website: string;
  image: string | null;
  sort_order: number;
  category: OrganizationMemberCategory;
};

function getDefaults(category: OrganizationMemberCategory): FormData {
  return {
    name: "",
    member_role: "",
    school: "",
    research_areas: "",
    email: "",
    website: "",
    image: null,
    sort_order: 0,
    category,
  };
}

function formDataFromMember(m: OrganizationMember): FormData {
  return {
    name: m.name,
    member_role: m.member_role ?? "",
    school: m.school ?? "",
    research_areas: m.research_areas ?? "",
    email: m.email ?? "",
    website: m.website ?? "",
    image: m.image,
    sort_order: m.sort_order,
    category: m.category,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  defaultCategory: OrganizationMemberCategory;
};

export function OrganizationMemberDialog({ open, onOpenChange, member, defaultCategory }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>(() =>
    member ? formDataFromMember(member) : getDefaults(defaultCategory)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadOrganizationImage(file);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if ("error" in result) {
      toast.error(result.error);
    } else {
      update("image", result.url);
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error("請輸入名稱");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: formData.name.trim(),
      member_role: formData.member_role.trim() || null,
      school: formData.school.trim() || null,
      research_areas: formData.research_areas.trim() || null,
      email: formData.email.trim() || null,
      website: formData.website.trim() || null,
      image: formData.image,
      sort_order: formData.sort_order,
      category: formData.category,
    };

    let error;
    if (member) {
      ({ error } = await supabase.from("organization_members").update(payload).eq("id", member.id));
    } else {
      ({ error } = await supabase.from("organization_members").insert({ ...payload, summary: null, link: null }));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(member ? "已更新" : "已建立");
      onOpenChange(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!member) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("organization_members").delete().eq("id", member.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("已刪除");
      onOpenChange(false);
      router.refresh();
    }
  }

  const isEditMode = member !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:!max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-0">
          <DialogTitle>{isEditMode ? "編輯成員" : "新增成員"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改成員資訊" : "建立新的組織成員"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* 圖片 */}
          <div className="space-y-3">
            <Label>照片</Label>
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-input bg-muted shrink-0">
                <Image
                  src={formData.image || "/placeholder.png"}
                  alt={formData.name || "成員照片"}
                  fill
                  className="object-cover"
                  unoptimized={isExternalImage(formData.image)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <><Loader2 className="size-4 animate-spin mr-1" />上傳中...</>
                  ) : (
                    <><ImagePlus className="size-4 mr-1" />上傳照片</>
                  )}
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update("image", null)}
                  >
                    移除照片
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* 分類 + 排序 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>分類</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => update("category", v as OrganizationMemberCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>排序（數字越小越前面）</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => update("sort_order", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* 姓名 + 職稱 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="成員姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>職稱（選填）</Label>
              <Input
                value={formData.member_role}
                onChange={(e) => update("member_role", e.target.value)}
                placeholder="例：主任、副主任"
              />
            </div>
          </div>

          {/* 學歷 + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>最高學歷（選填）</Label>
              <Input
                value={formData.school}
                onChange={(e) => update("school", e.target.value)}
                placeholder="例：美國南美以美大學（資工博士）"
              />
            </div>
            <div className="space-y-2">
              <Label>Email（選填）</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="professor@university.edu.tw"
              />
            </div>
          </div>

          {/* 個人網頁 */}
          <div className="space-y-2">
            <Label>個人網頁（選填）</Label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* 研究領域 */}
          <div className="space-y-2">
            <Label>研究領域（選填）</Label>
            <Textarea
              value={formData.research_areas}
              onChange={(e) => update("research_areas", e.target.value)}
              placeholder="研究領域（以頓號或換行分隔）"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="px-8 py-4 border-t flex-row gap-3">
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Trash2 className="size-4 mr-1" />}
                  刪除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確定要刪除？</AlertDialogTitle>
                  <AlertDialogDescription>此操作無法復原</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>確定刪除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleSave} disabled={saving} className="ml-auto">
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            {isEditMode ? "儲存" : "建立"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
