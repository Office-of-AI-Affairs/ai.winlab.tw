"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { revalidateOrganizationMembers } from "@/app/introduction/actions";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { useImageUpload } from "@/hooks/use-image-upload";
import { uploadOrganizationImage } from "@/lib/upload-image";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
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
    category: m.category as OrganizationMemberCategory,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  defaultCategory: OrganizationMemberCategory;
};

export function OrganizationMemberDialog({ open, onOpenChange, member, defaultCategory }: Props) {
  const { formData, updateField, resetForm, isSaving, isDeleting, save, remove } = useDialogForm<FormData>({
    table: "organization_members",
    editingId: member?.id ?? null,
    getDefaults: () => member ? formDataFromMember(member) : getDefaults(defaultCategory),
    buildPayload: (form) => {
      const payload = {
        name: form.name.trim(),
        member_role: form.member_role.trim() || null,
        school: form.school.trim() || null,
        research_areas: form.research_areas.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        image: form.image,
        sort_order: form.sort_order,
        category: form.category,
      };
      if (!member) {
        return { ...payload, summary: null, link: null };
      }
      return payload;
    },
    validate: (form) => form.name.trim() ? null : "請輸入名稱",
    onClose: () => onOpenChange(false),
    onAfterSave: revalidateOrganizationMembers,
    onAfterRemove: revalidateOrganizationMembers,
  });

  const { isUploading: uploading, fileInputRef, triggerFileInput, handleFileChange } = useImageUpload(uploadOrganizationImage);

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(e);
    if (url) updateField("image", url);
  };

  useEffect(() => {
    resetForm(member ? formDataFromMember(member) : getDefaults(defaultCategory));
  }, [member, defaultCategory, resetForm]);

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
                  src={resolveImageSrc(formData.image)}
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
                  onClick={triggerFileInput}
                >
                  {uploading ? (
                    <><Loader2 className="size-4 animate-spin mr-1" />上傳中…</>
                  ) : (
                    <><ImagePlus className="size-4 mr-1" />上傳照片</>
                  )}
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="移除照片"
                    onClick={() => updateField("image", null)}
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
                onChange={onImageUpload}
              />
            </div>
          </div>

          {/* 分類 + 排序 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>分類</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => updateField("category", v as OrganizationMemberCategory)}
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
                onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* 姓名 + 職稱 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="成員姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>職稱（選填）</Label>
              <Input
                value={formData.member_role}
                onChange={(e) => updateField("member_role", e.target.value)}
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
                onChange={(e) => updateField("school", e.target.value)}
                placeholder="例：美國南美以美大學（資工博士）"
              />
            </div>
            <div className="space-y-2">
              <Label>Email（選填）</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
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
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* 研究領域 */}
          <div className="space-y-2">
            <Label>研究領域（選填）</Label>
            <Textarea
              value={formData.research_areas}
              onChange={(e) => updateField("research_areas", e.target.value)}
              placeholder="研究領域（以頓號或換行分隔）"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="px-8 py-4 border-t flex-row gap-3">
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Trash2 className="size-4 mr-1" />}
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
                  <AlertDialogAction onClick={remove}>確定刪除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={save} disabled={isSaving} className="ml-auto">
            {isSaving && <Loader2 className="size-4 animate-spin mr-1" />}
            {isEditMode ? "儲存" : "建立"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
