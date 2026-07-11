"use client";

import { revalidateOrganizationMembers } from "@/app/[locale]/introduction/actions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useImageUpload } from "@/hooks/use-image-upload";
import type {
  OrganizationMember,
  OrganizationMemberCategory,
} from "@winlab/db";
import { uploadOrganizationImage } from "@/lib/upload-image";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";
import { ArrowLeft, Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function OrganizationMemberEditClient({
  id,
  initialMember,
}: {
  id: string;
  initialMember: OrganizationMember;
}) {
  const t = useT();
  const router = useRouter();

  const CATEGORIES: { value: OrganizationMemberCategory; label: string }[] = [
    { value: "core", label: t.introduction.category.core },
    { value: "legal_entity", label: t.introduction.category.legalEntity },
    { value: "industry", label: t.introduction.category.industry },
  ];

  const {
    data: member, setData: setMember, hasChanges,
    isSaving, isDeleting,
    save, remove, guardNavigation,
  } = useContentEditor({
    table: "organization_members",
    id,
    initialData: initialMember,
    fields: ["name", "summary", "image", "link", "category", "sort_order", "school", "research_areas", "email", "website", "member_role"],
    redirectTo: "/introduction",
    publishable: false,
    onAfterSave: revalidateOrganizationMembers,
    onAfterRemove: revalidateOrganizationMembers,
  });

  const { isUploading: isUploadingImage, fileInputRef, triggerFileInput, handleFileChange } = useImageUpload(uploadOrganizationImage);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(e);
    if (url) setMember((prev) => ({ ...prev, image: url }));
  };

  return (
    <PageShell tone="admin">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => guardNavigation(() => router.push("/introduction"))}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.actions.back}
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

      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label>{t.common.category}</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs md:text-sm"
            value={member.category}
            onChange={(e) =>
              setMember((prev) => ({
                ...prev,
                category: e.target.value as OrganizationMemberCategory,
              }))
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
          <Label>{t.common.name}</Label>
          <Input
            value={member.name}
            onChange={(e) => setMember((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t.admin.member.namePlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.summaryLabel}</Label>
          <Textarea
            className="min-h-[120px] resize-y"
            value={member.summary ?? ""}
            onChange={(e) =>
              setMember((prev) => ({ ...prev, summary: e.target.value || null }))
            }
            placeholder={t.admin.member.summaryPlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.imageLabel}</Label>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-input bg-muted">
              <Image
                src={resolveImageSrc(member.image)}
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
              onChange={onImageChange}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={triggerFileInput}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {t.actions.uploadImage}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.linkLabel}</Label>
          <Input
            type="url"
            value={member.link ?? ""}
            onChange={(e) =>
              setMember((prev) => ({ ...prev, link: e.target.value || null }))
            }
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.common.sortOrderHint}</Label>
          <Input
            type="number"
            value={member.sort_order}
            onChange={(e) =>
              setMember((prev) => ({
                ...prev,
                sort_order: parseInt(e.target.value, 10) || 0,
              }))
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.roleLabel}</Label>
          <Input
            value={member.member_role ?? ""}
            onChange={(e) => setMember((prev) => ({ ...prev, member_role: e.target.value || null }))}
            placeholder={t.admin.member.rolePlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.schoolLabel}</Label>
          <Input
            value={member.school ?? ""}
            onChange={(e) => setMember((prev) => ({ ...prev, school: e.target.value || null }))}
            placeholder={t.admin.member.schoolPlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.researchLabel}</Label>
          <Textarea
            className="min-h-[80px] resize-y"
            value={member.research_areas ?? ""}
            onChange={(e) => setMember((prev) => ({ ...prev, research_areas: e.target.value || null }))}
            placeholder={t.admin.member.researchPlaceholder}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.emailLabel}</Label>
          <Input
            type="email"
            value={member.email ?? ""}
            onChange={(e) => setMember((prev) => ({ ...prev, email: e.target.value || null }))}
            placeholder="professor@university.edu.tw"
          />
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.member.websiteLabel}</Label>
          <Input
            type="url"
            value={member.website ?? ""}
            onChange={(e) => setMember((prev) => ({ ...prev, website: e.target.value || null }))}
            placeholder="https://..."
          />
        </div>

      </div>
    </PageShell>
  );
}
