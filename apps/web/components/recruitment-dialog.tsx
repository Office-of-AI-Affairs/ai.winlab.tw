"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ImagePlus,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { revalidateAllEventCaches } from "@/app/[locale]/events/actions";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { RecruitmentOwnerPicker } from "@/components/recruitment-owner-picker";
import { normalizeApplicationMethod } from "@/lib/recruitment-application-method";
import { uploadRecruitmentImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useT } from "@/lib/i18n/locale-provider";
import type {
  ApplicationMethod,
  ApplicationMethodLink,
  ContactInfo,
  Recruitment,
  RecruitmentPosition,
  RecruitmentPositionType,
} from "@winlab/db";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const POSITION_TYPE_VALUES: RecruitmentPositionType[] = [
  "full_time",
  "internship",
  "part_time",
  "remote",
];

type FormData = {
  title: string;
  image: string | null;
  company_description: string | null;
  start_date: string;
  end_date: string | null;
  positions: RecruitmentPosition[];
  application_method: ApplicationMethod | null;
  contact: ContactInfo | null;
  required_documents: string | null;
};

function getDefaults(): FormData {
  return {
    title: "",
    image: null,
    company_description: null,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    positions: [],
    application_method: null,
    contact: null,
    required_documents: null,
  };
}

function formDataFromRecruitment(r: Recruitment): FormData {
  return {
    title: r.title,
    image: r.image,
    company_description: r.company_description,
    start_date: r.start_date,
    end_date: r.end_date,
    positions: r.positions ?? [],
    application_method: normalizeApplicationMethod(r.application_method, r.link),
    contact: r.contact,
    required_documents: r.required_documents,
  };
}

type RecruitmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruitment: Recruitment | null;
  eventId: string | null;
};

export function RecruitmentDialog({
  open,
  onOpenChange,
  recruitment,
  eventId,
}: RecruitmentDialogProps) {
  const router = useRouter();
  const t = useT();
  const { user, isAdmin } = useAuth();

  function getPositionTypeLabel(type: RecruitmentPositionType): string {
    switch (type) {
      case "full_time":
        return t.recruitment.positionType.fullTime;
      case "internship":
        return t.recruitment.positionType.internship;
      case "part_time":
        return t.recruitment.positionType.partTime;
      case "remote":
        return t.recruitment.positionType.remote;
      default:
        return type;
    }
  }
  const { formData, setFormData, updateField, resetForm } = useDialogForm<FormData>({
    table: "competitions",
    editingId: recruitment?.id ?? null,
    getDefaults,
    buildPayload: () => ({}),
    onClose: () => onOpenChange(false),
  });
  const { isUploading: uploading, fileInputRef, handleFileChange } = useImageUpload(uploadRecruitmentImage);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    resetForm(recruitment ? formDataFromRecruitment(recruitment) : getDefaults());
  }, [recruitment, resetForm]);

  function updatePosition(
    index: number,
    field: keyof RecruitmentPosition,
    value: string | number | null,
  ) {
    setFormData((prev) => {
      const positions = [...prev.positions];
      positions[index] = { ...positions[index], [field]: value };
      return { ...prev, positions };
    });
  }

  function addPosition() {
    setFormData((prev) => ({
      ...prev,
      positions: [
        ...prev.positions,
        {
          name: "",
          location: null,
          type: "full_time" as RecruitmentPositionType,
          count: 1,
          salary: null,
          responsibilities: null,
          requirements: null,
          nice_to_have: null,
        },
      ],
    }));
  }

  function removePosition(index: number) {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions.filter((_, i) => i !== index),
    }));
  }

  function updateApplicationMethod(field: keyof ApplicationMethod, value: string) {
    setFormData((prev) => ({
      ...prev,
      application_method: {
        ...prev.application_method,
        [field]: value || undefined,
      },
    }));
  }

  function updateApplicationMethodLink(
    index: number,
    field: keyof ApplicationMethodLink,
    value: string,
  ) {
    setFormData((prev) => {
      const nextLinks = [...(prev.application_method?.links ?? [])];
      nextLinks[index] = {
        ...nextLinks[index],
        [field]: value,
      };

      return {
        ...prev,
        application_method: {
          ...prev.application_method,
          links: nextLinks,
        },
      };
    });
  }

  function addApplicationMethodLink() {
    setFormData((prev) => ({
      ...prev,
      application_method: {
        ...prev.application_method,
        links: [
          ...(prev.application_method?.links ?? []),
          { label: "", url: "" },
        ],
      },
    }));
  }

  function removeApplicationMethodLink(index: number) {
    setFormData((prev) => ({
      ...prev,
      application_method: {
        ...prev.application_method,
        links: (prev.application_method?.links ?? []).filter(
          (_, currentIndex) => currentIndex !== index,
        ),
      },
    }));
  }

  function updateContact(field: keyof ContactInfo, value: string) {
    setFormData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value || undefined,
      },
    }));
  }

  async function onImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const url = await handleFileChange(e);
    if (url) updateField("image", url);
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      toast.error(t.recruitment.dialog.titleRequired);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Clean up optional fields
    const am = normalizeApplicationMethod(formData.application_method);
    const hasApplicationMethod = am !== null;
    const ct = formData.contact;
    const hasContact = ct && (ct.name || ct.email || ct.phone);

    const publicPayload = {
      title: formData.title.trim(),
      link: am?.links?.[0]?.url ?? "",
      image: formData.image,
      company_description: formData.company_description?.trim() || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
    };
    const privatePayload = {
      positions: formData.positions.length > 0 ? formData.positions : null,
      application_method: hasApplicationMethod ? am : null,
      contact: hasContact ? ct : null,
      required_documents: formData.required_documents?.trim() || null,
    };
    const hasPrivatePayload = Boolean(
      privatePayload.positions ||
      privatePayload.application_method ||
      privatePayload.contact ||
      privatePayload.required_documents
    );

    let error;
    if (recruitment) {
      const { error: publicError } = await supabase
        .from("competitions")
        .update(publicPayload)
        .eq("id", recruitment.id);
      error = publicError;

      if (!error) {
        if (hasPrivatePayload) {
          const { error: privateError } = await supabase
            .from("competition_private_details")
            .upsert({
              competition_id: recruitment.id,
              ...privatePayload,
            });
          error = privateError;
        } else {
          const { error: privateError } = await supabase
            .from("competition_private_details")
            .delete()
            .eq("competition_id", recruitment.id);
          error = privateError;
        }
      }
    } else {
      if (!user) {
        toast.error(t.common.loginFirst);
        setSaving(false);
        return;
      }
      const { data, error: publicError } = await supabase
        .from("competitions")
        .insert({ ...publicPayload, event_id: eventId, created_by: user.id })
        .select("id")
        .single();
      error = publicError;

      if (!error && data?.id && hasPrivatePayload) {
        const { error: privateError } = await supabase
          .from("competition_private_details")
          .insert({
            competition_id: data.id,
            ...privatePayload,
          });
        error = privateError;
      }
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(recruitment ? t.common.updated : t.common.created);
      onOpenChange(false);
      await revalidateAllEventCaches();
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!recruitment) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("competitions")
      .delete()
      .eq("id", recruitment.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.common.deleted);
      onOpenChange(false);
      await revalidateAllEventCaches();
      router.refresh();
    }
  }

  const isEditMode = recruitment !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:!max-w-6xl max-h-[90vh] flex flex-col p-0"
      >
        <DialogHeader className="px-8 pt-8 pb-0">
          <DialogTitle>
            {isEditMode
              ? t.recruitment.dialog.editTitle
              : t.recruitment.dialog.createTitle}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t.recruitment.dialog.editDescription
              : t.recruitment.dialog.createDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          <div className="space-y-3">
            <Label>{t.common.coverImage}</Label>
            <div className="flex items-center gap-6">
              {formData.image ? (
                <div className="relative w-40 aspect-video rounded-md overflow-hidden border">
                  <Image
                    src={formData.image}
                    alt={t.common.coverImage}
                    fill
                    className="object-cover"
                    unoptimized={isExternalImage(formData.image)}
                  />
                </div>
              ) : (
                <div className="w-40 aspect-video rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                  <ImagePlus className="size-6" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1" />
                      {t.common.uploading}
                    </>
                  ) : (
                    t.actions.uploadImage
                  )}
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateField("image", null)}
                  >
                    {t.actions.removeImage}
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

          <div className="space-y-2">
            <Label htmlFor="title">{t.common.title}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder={t.recruitment.dialog.titlePlaceholder}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="company_description">
              {t.recruitment.dialog.companyDescLabel}
            </Label>
            <Textarea
              id="company_description"
              value={formData.company_description ?? ""}
              onChange={(e) =>
                updateField("company_description", e.target.value || null)
              }
              maxLength={300}
              placeholder={t.recruitment.dialog.companyDescPlaceholder}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(formData.company_description ?? "").length}/300
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                {t.recruitment.dialog.startDate}
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">{t.recruitment.dialog.endDate}</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date ?? ""}
                onChange={(e) =>
                  updateField("end_date", e.target.value || null)
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>{t.recruitment.dialog.positions}</Label>
            {formData.positions.map((pos, index) => (
              <Collapsible key={index} defaultOpen={!pos.name}>
                <div className="border rounded-md">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center justify-between rounded-md px-0 py-0 text-sm hover:bg-accent"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">
                            {pos.name || t.recruitment.dialog.newPosition}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {getPositionTypeLabel(pos.type)}
                          </span>
                        </div>
                        <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      aria-label={t.recruitment.dialog.deletePositionAria.replace(
                        "{n}",
                        String(index + 1),
                      )}
                      className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removePosition(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 space-y-4 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t.recruitment.dialog.positionName}
                          </Label>
                          <Input
                            value={pos.name}
                            onChange={(e) =>
                              updatePosition(index, "name", e.target.value)
                            }
                            placeholder={
                              t.recruitment.dialog.positionNamePlaceholder
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t.recruitment.dialog.location}
                          </Label>
                          <Input
                            value={pos.location ?? ""}
                            onChange={(e) =>
                              updatePosition(
                                index,
                                "location",
                                e.target.value || null,
                              )
                            }
                            placeholder={
                              t.recruitment.dialog.locationPlaceholder
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t.recruitment.dialog.type}
                          </Label>
                          <Select
                            value={pos.type}
                            onValueChange={(v) =>
                              updatePosition(
                                index,
                                "type",
                                v as RecruitmentPositionType,
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {POSITION_TYPE_VALUES.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {getPositionTypeLabel(value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t.recruitment.dialog.count}
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={pos.count}
                            onChange={(e) =>
                              updatePosition(
                                index,
                                "count",
                                parseInt(e.target.value) || 1,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {t.recruitment.dialog.salary}
                          </Label>
                          <Input
                            value={pos.salary ?? ""}
                            onChange={(e) =>
                              updatePosition(
                                index,
                                "salary",
                                e.target.value || null,
                              )
                            }
                            placeholder={t.recruitment.dialog.salaryPlaceholder}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t.recruitment.dialog.responsibilities}
                        </Label>
                        <Textarea
                          value={pos.responsibilities ?? ""}
                          onChange={(e) =>
                            updatePosition(
                              index,
                              "responsibilities",
                              e.target.value || null,
                            )
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t.recruitment.dialog.requirements}
                        </Label>
                        <Textarea
                          value={pos.requirements ?? ""}
                          onChange={(e) =>
                            updatePosition(
                              index,
                              "requirements",
                              e.target.value || null,
                            )
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t.recruitment.dialog.niceToHave}
                        </Label>
                        <Textarea
                          value={pos.nice_to_have ?? ""}
                          onChange={(e) =>
                            updatePosition(
                              index,
                              "nice_to_have",
                              e.target.value || null,
                            )
                          }
                          rows={2}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addPosition}
            >
              <Plus className="size-4 mr-1" />
              {t.recruitment.dialog.addPosition}
            </Button>
          </div>

          <div className="space-y-3">
            <Label>{t.recruitment.dialog.applicationMethod}</Label>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={formData.application_method?.email ?? ""}
                    onChange={(e) =>
                      updateApplicationMethod("email", e.target.value)
                    }
                    placeholder="hr@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {t.recruitment.dialog.otherLabel}
                  </Label>
                  <Input
                    value={formData.application_method?.other ?? ""}
                    onChange={(e) =>
                      updateApplicationMethod("other", e.target.value)
                    }
                    placeholder={t.recruitment.dialog.otherPlaceholder}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">
                    {t.recruitment.dialog.namedLinks}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addApplicationMethodLink}
                  >
                    <Plus className="size-4 mr-1" />
                    {t.recruitment.dialog.addLink}
                  </Button>
                </div>
                {(formData.application_method?.links ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {(formData.application_method?.links ?? []).map(
                      (link, index) => (
                        <div
                          key={`application-link-${index}`}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-3 items-end"
                        >
                          <div className="space-y-1">
                            <Label className="text-xs">{t.common.name}</Label>
                            <Input
                              value={link.label}
                              onChange={(e) =>
                                updateApplicationMethodLink(
                                  index,
                                  "label",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                t.recruitment.dialog.linkLabelPlaceholder
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              {t.recruitment.dialog.linkUrl}
                            </Label>
                            <Input
                              type="url"
                              value={link.url}
                              onChange={(e) =>
                                updateApplicationMethodLink(
                                  index,
                                  "url",
                                  e.target.value,
                                )
                              }
                              placeholder="https://..."
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t.recruitment.dialog.deleteLinkAria.replace(
                              "{n}",
                              String(index + 1),
                            )}
                            onClick={() => removeApplicationMethodLink(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t.recruitment.dialog.linksHint}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t.recruitment.dialog.contactInfo}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t.common.fullName}</Label>
                <Input
                  value={formData.contact?.name ?? ""}
                  onChange={(e) => updateContact("name", e.target.value)}
                  placeholder={t.recruitment.dialog.contactNamePlaceholder}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={formData.contact?.email ?? ""}
                  onChange={(e) => updateContact("email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.common.phone}</Label>
                <Input
                  type="tel"
                  value={formData.contact?.phone ?? ""}
                  onChange={(e) => updateContact("phone", e.target.value)}
                  placeholder="02-1234-5678"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="required_documents">
              {t.recruitment.dialog.requiredDocs}
            </Label>
            <Textarea
              id="required_documents"
              value={formData.required_documents ?? ""}
              onChange={(e) =>
                updateField("required_documents", e.target.value || null)
              }
              placeholder={t.recruitment.dialog.requiredDocsPlaceholder}
              rows={2}
            />
          </div>

          {isAdmin && isEditMode && recruitment && (
            <div className="space-y-3">
              <div>
                <Label>{t.recruitment.dialog.ownersLabel}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.recruitment.dialog.ownersHint}
                </p>
              </div>
              <RecruitmentOwnerPicker competitionId={recruitment.id} />
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-4 border-t flex-row gap-3">
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="size-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="size-4 mr-1" />
                  )}
                  {t.actions.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t.common.confirmDeleteTitle}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.common.deleteIrreversible}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t.actions.confirmDelete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleSave} disabled={saving} className="ml-auto">
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            {isEditMode ? t.actions.save : t.actions.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
