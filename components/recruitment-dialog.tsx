"use client";

import { useEffect, useRef, useState } from "react";
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

import { createClient } from "@/lib/supabase/client";
import { uploadRecruitmentImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import type {
  ApplicationMethod,
  ContactInfo,
  Recruitment,
  RecruitmentPosition,
  RecruitmentPositionType,
} from "@/lib/supabase/types";

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

const POSITION_TYPES: { value: RecruitmentPositionType; label: string }[] = [
  { value: "full_time", label: "全職" },
  { value: "internship", label: "實習" },
  { value: "part_time", label: "兼職" },
  { value: "remote", label: "遠端" },
];

function getPositionTypeLabel(type: RecruitmentPositionType): string {
  return POSITION_TYPES.find((t) => t.value === type)?.label ?? type;
}

type FormData = {
  title: string;
  link: string;
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
    link: "",
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
    link: r.link,
    image: r.image,
    company_description: r.company_description,
    start_date: r.start_date,
    end_date: r.end_date,
    positions: r.positions ?? [],
    application_method: r.application_method,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>(getDefaults);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reset form when recruitment prop changes (sync external prop → internal state)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(
      recruitment ? formDataFromRecruitment(recruitment) : getDefaults(),
    );
  }, [recruitment]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

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

  function updateContact(field: keyof ContactInfo, value: string) {
    setFormData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value || undefined,
      },
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadRecruitmentImage(file);
    setUploading(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      updateField("image", result.url);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      toast.error("請輸入標題");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Clean up optional fields
    const am = formData.application_method;
    const hasApplicationMethod = am && (am.email || am.url || am.other);
    const ct = formData.contact;
    const hasContact = ct && (ct.name || ct.email || ct.phone);

    const payload = {
      title: formData.title.trim(),
      link: formData.link.trim(),
      image: formData.image,
      company_description: formData.company_description?.trim() || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      positions: formData.positions.length > 0 ? formData.positions : null,
      application_method: hasApplicationMethod ? am : null,
      contact: hasContact ? ct : null,
      required_documents: formData.required_documents?.trim() || null,
    };

    let error;
    if (recruitment) {
      // Edit mode
      ({ error } = await supabase
        .from("competitions")
        .update(payload)
        .eq("id", recruitment.id));
    } else {
      // Create mode
      ({ error } = await supabase
        .from("competitions")
        .insert({ ...payload, event_id: eventId }));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(recruitment ? "已更新" : "已建立");
      onOpenChange(false);
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
      toast.success("已刪除");
      onOpenChange(false);
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
          <DialogTitle>{isEditMode ? "編輯徵才" : "新增徵才"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "修改徵才資訊" : "建立新的徵才項目"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* 1. Cover image */}
          <div className="space-y-3">
            <Label>封面圖片</Label>
            <div className="flex items-center gap-6">
              {formData.image ? (
                <div className="relative w-40 aspect-video rounded-md overflow-hidden border">
                  <Image
                    src={formData.image}
                    alt="封面圖片"
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
                      上傳中...
                    </>
                  ) : (
                    "上傳圖片"
                  )}
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateField("image", null)}
                  >
                    移除圖片
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

          {/* 2. Title + Link */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">標題</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="公司 / 組織名稱"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">連結</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => updateField("link", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* 3. Company description */}
          <div className="space-y-3">
            <Label htmlFor="company_description">公司簡介</Label>
            <Textarea
              id="company_description"
              value={formData.company_description ?? ""}
              onChange={(e) =>
                updateField("company_description", e.target.value || null)
              }
              maxLength={300}
              placeholder="簡短描述公司或組織（最多 300 字）"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(formData.company_description ?? "").length}/300
            </p>
          </div>

          {/* 4. Recruitment period */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">開始日期</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">結束日期</Label>
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

          {/* 5. Positions */}
          <div className="space-y-4">
            <Label>職缺</Label>
            {formData.positions.map((pos, index) => (
              <Collapsible key={index} defaultOpen={!pos.name}>
                <div className="border rounded-md">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {pos.name || "新職缺"}
                        </span>
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {getPositionTypeLabel(pos.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          role="button"
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePosition(index);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </span>
                        <ChevronDown className="size-4 transition-transform [[data-state=open]_&]:rotate-180" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 space-y-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">職缺名稱</Label>
                          <Input
                            value={pos.name}
                            onChange={(e) =>
                              updatePosition(index, "name", e.target.value)
                            }
                            placeholder="例：前端工程師"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">地點</Label>
                          <Input
                            value={pos.location ?? ""}
                            onChange={(e) =>
                              updatePosition(
                                index,
                                "location",
                                e.target.value || null,
                              )
                            }
                            placeholder="例：台北市"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">類型</Label>
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
                              {POSITION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">人數</Label>
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
                          <Label className="text-xs">薪資</Label>
                          <Input
                            value={pos.salary ?? ""}
                            onChange={(e) =>
                              updatePosition(
                                index,
                                "salary",
                                e.target.value || null,
                              )
                            }
                            placeholder="例：40,000-60,000 NTD/月"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">工作內容</Label>
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
                        <Label className="text-xs">必要條件</Label>
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
                        <Label className="text-xs">加分條件</Label>
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
              新增職缺
            </Button>
          </div>

          {/* 6. Application method */}
          <div className="space-y-3">
            <Label>應徵方式</Label>
            <div className="grid grid-cols-3 gap-4">
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
                <Label className="text-xs">網址</Label>
                <Input
                  type="url"
                  value={formData.application_method?.url ?? ""}
                  onChange={(e) =>
                    updateApplicationMethod("url", e.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">其他</Label>
                <Input
                  value={formData.application_method?.other ?? ""}
                  onChange={(e) =>
                    updateApplicationMethod("other", e.target.value)
                  }
                  placeholder="其他方式"
                />
              </div>
            </div>
          </div>

          {/* 7. Contact */}
          <div className="space-y-3">
            <Label>聯絡資訊</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">姓名</Label>
                <Input
                  value={formData.contact?.name ?? ""}
                  onChange={(e) => updateContact("name", e.target.value)}
                  placeholder="聯絡人姓名"
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
                <Label className="text-xs">電話</Label>
                <Input
                  type="tel"
                  value={formData.contact?.phone ?? ""}
                  onChange={(e) => updateContact("phone", e.target.value)}
                  placeholder="02-1234-5678"
                />
              </div>
            </div>
          </div>

          {/* 8. Required documents */}
          <div className="space-y-3">
            <Label htmlFor="required_documents">應備文件</Label>
            <Textarea
              id="required_documents"
              value={formData.required_documents ?? ""}
              onChange={(e) =>
                updateField("required_documents", e.target.value || null)
              }
              placeholder="例：履歷、作品集、成績單..."
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
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
                  刪除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確定要刪除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作無法復原
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    確定刪除
                  </AlertDialogAction>
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
