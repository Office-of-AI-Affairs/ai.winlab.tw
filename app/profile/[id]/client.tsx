"use client";

import { useAuth } from "@/components/auth-provider";
import { AppLink } from "@/components/app-link";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubButton } from "@/components/ui/sub-button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { ExternalResult, Profile, Result } from "@/lib/supabase/types";
import { VendorEventsSection } from "@/components/vendor-events-section";
import { uploadExternalResultImage, uploadResumePdf } from "@/lib/upload-image";
import { hasCustomImage, isExternalImage } from "@/lib/utils";
import {
  ArrowLeftIcon,
  EyeOff,
  FileUp,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

function mergeAllLinks(profile: Profile): string[] {
  const structured = [
    profile.linkedin,
    profile.facebook,
    profile.github,
    profile.website,
  ].filter(Boolean) as string[];
  const extra = (profile.social_links as string[] | null) ?? [];
  const seen = new Set<string>();
  return [...structured, ...extra].filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function safeHref(url: string): string | null {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function displayLinkLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname}${pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

export function ProfilePageClient({
  initialProfile,
  results,
  isOwner,
  canViewPrivateProfile,
  eventSlugMap,
  initialExternalResults,
}: {
  initialProfile: Profile;
  results: Result[];
  isOwner: boolean;
  canViewPrivateProfile: boolean;
  eventSlugMap: Record<string, string>;
  initialExternalResults: ExternalResult[];
}) {
  const { user, isVendor, refreshProfile } = useAuth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [savingField, setSavingField] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [links, setLinks] = useState<string[]>(() => mergeAllLinks(initialProfile));

  // External results
  const [externalResults, setExternalResults] = useState<ExternalResult[]>(initialExternalResults);
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [exSaving, setExSaving] = useState(false);
  const [exUploadingImage, setExUploadingImage] = useState(false);
  const [exEditingId, setExEditingId] = useState<string | null>(null);
  const [exForm, setExForm] = useState({ title: "", description: "", link: "", image: "" });
  const exFileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingResume(true);
    e.target.value = "";
    const result = await uploadResumePdf(file);
    if ("error" in result) {
      setUploadingResume(false);
      return;
    }
    await saveField("resume", result.url);
    setUploadingResume(false);
  };

  const openNewDialog = () => {
    setExEditingId(null);
    setExForm({ title: "", description: "", link: "", image: "" });
    setExDialogOpen(true);
  };

  const openEditDialog = (ext: ExternalResult) => {
    setExEditingId(ext.id);
    setExForm({
      title: ext.title,
      description: ext.description ?? "",
      link: ext.link ?? "",
      image: ext.image ?? "",
    });
    setExDialogOpen(true);
  };

  const handleExImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExUploadingImage(true);
    const result = await uploadExternalResultImage(file);
    e.target.value = "";
    if ("url" in result) setExForm((f) => ({ ...f, image: result.url }));
    setExUploadingImage(false);
  };

  const saveField = async (field: string, value: string | null) => {
    if (!user) return;
    setSavingField(field);
    const supabase = createClient();
    await supabase.from("profiles").update({ [field]: value || null }).eq("id", user.id);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, phone, linkedin, facebook, github, website, resume, social_links")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile(data as Profile);
      await refreshProfile();
    }
    setSavingField(null);
  };

  const saveLinks = async (next: string[]) => {
    if (!user) return;
    setSavingField("links");
    const supabase = createClient();
    const filtered = next.filter((l) => l.trim() !== "");
    await supabase.from("profiles").update({
      social_links: filtered,
      linkedin: null,
      facebook: null,
      github: null,
      website: null,
    }).eq("id", user.id);
    setLinks(filtered);
    setSavingField(null);
  };

  const addLink = () => setLinks((prev) => [...prev, ""]);
  const updateLink = (idx: number, val: string) =>
    setLinks((prev) => prev.map((l, i) => (i === idx ? val : l)));
  const removeLink = (idx: number) => {
    const next = links.filter((_, i) => i !== idx);
    setLinks(next);
    saveLinks(next);
  };

  const submitExternalResult = async () => {
    if (!user || !exForm.title.trim()) return;
    setExSaving(true);
    const supabase = createClient();
    const payload = {
      title: exForm.title.trim(),
      description: exForm.description.trim() || null,
      link: exForm.link.trim() || null,
      image: exForm.image.trim() || null,
    };
    if (exEditingId) {
      const { data } = await supabase
        .from("external_results")
        .update(payload)
        .eq("id", exEditingId)
        .select()
        .single();
      if (data) setExternalResults((prev) => prev.map((r) => r.id === exEditingId ? data as ExternalResult : r));
    } else {
      const { data } = await supabase
        .from("external_results")
        .insert({ user_id: user.id, ...payload })
        .select()
        .single();
      if (data) setExternalResults((prev) => [data as ExternalResult, ...prev]);
    }
    setExSaving(false);
    setExDialogOpen(false);
  };

  const deleteExternalResult = async (id: string) => {
    const supabase = createClient();
    await supabase.from("external_results").delete().eq("id", id);
    setExternalResults((prev) => prev.filter((r) => r.id !== id));
  };

  function resultHref(result: Result): string {
    const slug = result.event_id ? eventSlugMap[result.event_id] : null;
    if (!slug) return `/profile/${initialProfile.id}`;
    return isOwner
      ? `/events/${slug}/results/${result.id}/edit`
      : `/events/${slug}/results/${result.id}`;
  }

  const displayNameValue = profile.display_name || "未知使用者";
  const viewLinks = mergeAllLinks(profile).map((url) => ({
    href: safeHref(url),
    label: safeHref(url) ? displayLinkLabel(safeHref(url)!) : url,
  })).filter((l) => l.href);

  return (
    <main className="flex items-center justify-center">
      <PageShell tone="profile">
        <div className="grid p-4 gap-4">

          <Block variant="ghost" className="flex items-center justify-between">
            <SubButton href="/">
              <ArrowLeftIcon className="size-4" /> 返回首頁
            </SubButton>
            {isOwner && (
              <SubButton onClick={openNewDialog}>
                <Plus className="size-4" /> 新增外部成果
              </SubButton>
            )}
          </Block>

          <Dialog open={exDialogOpen} onOpenChange={setExDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{exEditingId ? "編輯外部成果" : "新增外部成果"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>標題 *</Label>
                  <Input
                    value={exForm.title}
                    onChange={(e) => setExForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="成果名稱"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>描述</Label>
                  <Textarea
                    value={exForm.description}
                    onChange={(e) => setExForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="簡短說明…"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>連結</Label>
                  <Input
                    value={exForm.link}
                    onChange={(e) => setExForm((f) => ({ ...f, link: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>封面圖片</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      {exForm.image && (
                        <Image src={exForm.image} alt="preview" fill className="object-cover" unoptimized />
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                      <input
                        ref={exFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleExImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={exUploadingImage}
                        onClick={() => exFileInputRef.current?.click()}
                      >
                        {exUploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                        {exUploadingImage ? "上傳中…" : "上傳圖片"}
                      </Button>
                      <p className="text-xs text-muted-foreground">JPEG、PNG、GIF、WebP，最大 5MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {exEditingId && (
                    <Button
                      variant="destructive"
                      onClick={() => { deleteExternalResult(exEditingId); setExDialogOpen(false); }}
                    >
                      <Trash2 className="size-4" /> 刪除
                    </Button>
                  )}
                  <Button
                    className="ml-auto"
                    onClick={submitExternalResult}
                    disabled={exSaving || !exForm.title.trim()}
                  >
                    {exSaving && <Loader2 className="size-4 animate-spin" />}
                    {exEditingId ? "儲存" : "新增"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="w-full grid lg:grid-cols-3 gap-4">

            {/* LEFT: profile */}
            <div className="col-span-1">
              <Block className="relative w-full">
                {isOwner && (
                  <div className="absolute top-6 right-6 z-10">
                    <SubButton onClick={() => setIsEditMode((v) => !v)}>
                      {isEditMode ? <EyeOff className="size-4" /> : <Pencil className="size-4" />}
                      {isEditMode ? "完成編輯" : "編輯資料"}
                    </SubButton>
                  </div>
                )}

                {canViewPrivateProfile && (
                  <Avatar size="3xl">
                    {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayNameValue} />}
                    <AvatarFallback>{displayNameValue.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                )}

                <div className="grid gap-2">
                  {isEditMode ? (
                    <div className="relative">
                      <Input
                        aria-label="姓名"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={() => saveField("display_name", displayName)}
                        className="h-auto w-full rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 pb-0.5 text-xl text-foreground shadow-none focus-visible:border-foreground focus-visible:ring-0"
                        placeholder="請輸入姓名"
                      />
                      {savingField === "display_name" && (
                        <Loader2 className="size-3 animate-spin absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                  ) : (
                    <h1 className="text-xl text-foreground">{displayNameValue}</h1>
                  )}

                  {isEditMode ? (
                    <div className="relative">
                      <Textarea
                        aria-label="個人簡介"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        onBlur={() => saveField("bio", bio)}
                        rows={3}
                        className="min-h-0 w-full rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 pb-0.5 text-sm shadow-none focus-visible:border-foreground focus-visible:ring-0 resize-none"
                        placeholder="簡單介紹一下自己…"
                      />
                      {savingField === "bio" && (
                        <Loader2 className="size-3 animate-spin absolute right-0 top-0 text-muted-foreground" />
                      )}
                    </div>
                  ) : profile.bio ? (
                    <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
                  ) : null}

                  {!canViewPrivateProfile && (
                    <p className="text-sm text-muted-foreground">
                      其餘個人資訊僅限登入後查看。
                    </p>
                  )}
                </div>

                {/* Resume */}
                {isEditMode ? (
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      履歷
                      {(savingField === "resume" || uploadingResume) && (
                        <Loader2 className="size-3 animate-spin inline ml-1 text-muted-foreground" />
                      )}
                    </span>
                    {profile.resume ? (
                      <div className="flex items-center gap-2">
                        <AppLink
                          href={profile.resume}
                          className="text-sm text-foreground underline truncate flex-1 min-w-0"
                        >
                          {displayLinkLabel(profile.resume)}
                        </AppLink>
                        <button
                          type="button"
                          aria-label="移除履歷"
                          onClick={() => saveField("resume", null)}
                          className="text-muted-foreground hover:text-destructive transition-colors duration-200"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">尚未上傳履歷</p>
                    )}
                    <input
                      ref={resumeFileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingResume}
                      onClick={() => resumeFileInputRef.current?.click()}
                      className="w-fit"
                    >
                      {uploadingResume ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                      {uploadingResume ? "上傳中…" : "上傳 PDF 履歷"}
                    </Button>
                  </div>
                ) : canViewPrivateProfile && profile.resume ? (
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">履歷</span>
                    <AppLink
                      href={profile.resume}
                      className="text-sm text-foreground underline"
                    >
                      查看履歷
                    </AppLink>
                  </div>
                ) : null}

                {/* Links */}
                {isEditMode ? (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        連結
                        {savingField === "links" && (
                          <Loader2 className="size-3 animate-spin inline ml-1 text-muted-foreground" />
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={addLink}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                      >
                        <Plus className="size-3" />
                        新增
                      </button>
                    </div>
                    {links.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          aria-label={`連結 ${idx + 1}`}
                          value={link}
                          onChange={(e) => updateLink(idx, e.target.value)}
                          onBlur={(e) => {
                            const next = links.map((l, i) => (i === idx ? e.target.value : l));
                            saveLinks(next);
                          }}
                          placeholder="https://..."
                          className="flex-1 text-sm bg-transparent border-b border-border focus:border-foreground outline-none pb-0.5"
                        />
                        <button
                          type="button"
                          aria-label={`刪除連結 ${idx + 1}`}
                          onClick={() => removeLink(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {links.length === 0 && (
                      <p className="text-xs text-muted-foreground">尚未新增連結</p>
                    )}
                  </div>
                ) : canViewPrivateProfile && viewLinks.length > 0 ? (
                  <div className="grid gap-2 text-sm underline">
                    {viewLinks.map(({ href, label }) => (
                      <AppLink key={href} href={href!}>
                        {label}
                      </AppLink>
                    ))}
                  </div>
                ) : null}

              </Block>
            </div>

            {/* RIGHT: results */}
            <div className="col-span-1 lg:col-span-2 grid gap-4 content-start">

              {isOwner && isVendor && <VendorEventsSection />}

              {results.length === 0 && externalResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">尚無成果紀錄</p>
              ) : (
                results.map((result) => (
                  <AppLink key={result.id} href={resultHref(result)} className="block">
                    <Block className="overflow-hidden flex flex-col lg:grid lg:grid-cols-2 gap-4">
                      <div className="-mx-6 -mt-6 lg:hidden">
                        <AspectRatio ratio={16 / 9}>
                          {hasCustomImage(result.header_image) ? (
                            <Image
                              src={result.header_image!}
                              alt={result.title}
                              fill
                              className="object-cover"
                              unoptimized={isExternalImage(result.header_image)}
                            />
                          ) : (
                            <div className="w-full h-full bg-primary" />
                          )}
                        </AspectRatio>
                      </div>
                      <div className="grid gap-2 lg:content-center">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold break-keep">
                            {result.title || "(無標題)"}
                          </h3>
                          {isOwner && result.status === "draft" && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">草稿</Badge>
                          )}
                        </div>
                        {result.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {result.summary}
                          </p>
                        )}
                      </div>
                      <div className="hidden lg:block -my-6 -mr-6">
                        <AspectRatio ratio={16 / 9}>
                          {hasCustomImage(result.header_image) ? (
                            <Image
                              src={result.header_image!}
                              alt={result.title}
                              fill
                              className="object-cover"
                              unoptimized={isExternalImage(result.header_image)}
                            />
                          ) : (
                            <div className="w-full h-full bg-primary" />
                          )}
                        </AspectRatio>
                      </div>
                    </Block>
                  </AppLink>
                ))
              )}

              {/* External results */}
              {externalResults.map((ext) => {
                const card = (
                  <Block className="overflow-hidden flex flex-col lg:grid lg:grid-cols-2 gap-4">
                    <div className="-mx-6 -mt-6 lg:hidden">
                      <AspectRatio ratio={16 / 9}>
                        {ext.image ? (
                          <Image src={ext.image} alt={ext.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-primary" />
                        )}
                      </AspectRatio>
                    </div>
                    <div className="grid gap-2 lg:content-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold break-keep">{ext.title}</h3>
                        {isOwner && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">外部</Badge>
                        )}
                      </div>
                      {ext.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{ext.description}</p>
                      )}
                    </div>
                    <div className="hidden lg:block -my-6 -mr-6">
                      <AspectRatio ratio={16 / 9}>
                        {ext.image ? (
                          <Image src={ext.image} alt={ext.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-primary" />
                        )}
                      </AspectRatio>
                    </div>
                  </Block>
                );

                if (isOwner) {
                  return (
                    <button key={ext.id} type="button" className="interactive-scale text-left w-full" onClick={() => openEditDialog(ext)}>
                      {card}
                    </button>
                  );
                }

                return ext.link ? (
                  <AppLink key={ext.id} href={ext.link} className="block">{card}</AppLink>
                ) : (
                  <div key={ext.id}>{card}</div>
                );
              })}

            </div>
          </div>

        </div>
      </PageShell>
    </main>
  );
}
