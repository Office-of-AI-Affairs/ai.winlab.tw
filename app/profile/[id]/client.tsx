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
import { useProfileEditor, mergeAllLinks } from "@/hooks/use-profile-editor";
import type { ExternalResult, Profile, Result } from "@/lib/supabase/types";
import { VendorEventsSection } from "@/components/vendor-events-section";
import { hasCustomImage, isExternalImage } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CalendarDays,
  EyeOff,
  ExternalLink,
  FileUp,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

type ProfileItem =
  | { kind: "result"; data: Result }
  | { kind: "external"; data: ExternalResult };

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
  eventNameMap,
  participatedEvents,
  initialExternalResults,
}: {
  initialProfile: Profile;
  results: Result[];
  isOwner: boolean;
  canViewPrivateProfile: boolean;
  eventSlugMap: Record<string, string>;
  eventNameMap: Record<string, string>;
  participatedEvents: { id: string; name: string; slug: string }[];
  initialExternalResults: ExternalResult[];
}) {
  const router = useRouter();
  const { user, isVendor, refreshProfile } = useAuth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogTab, setAddDialogTab] = useState<"event" | "external">("event");
  const exFileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const {
    profile, savingField,
    displayName, setDisplayName, bio, setBio,
    links, addLink, updateLink, removeLink, saveField, saveLinks,
    externalResults, exDialogOpen, setExDialogOpen, exSaving, exUploadingImage,
    exEditingId, exForm, setExForm,
    uploadingResume, handleResumeUpload, handleExImageUpload,
    openEditDialog, submitExternalResult, deleteExternalResult,
    creatingEventResultId, createEventResult,
  } = useProfileEditor({
    userId: user?.id ?? null,
    initialProfile,
    initialExternalResults,
    refreshProfile,
  });

  function resultHref(result: Result): string {
    const slug = result.event_id ? eventSlugMap[result.event_id] : null;
    if (!slug) return `/profile/${initialProfile.id}`;
    if (!isOwner) return `/events/${slug}/results/${result.id}`;
    const draftSuffix = result.status === "draft" ? "?mode=edit" : "";
    return `/events/${slug}/results/${result.id}${draftSuffix}`;
  }

  const mergedItems = useMemo<ProfileItem[]>(() => {
    const items: ProfileItem[] = [
      ...results.map((r) => ({ kind: "result" as const, data: r })),
      ...externalResults.map((e) => ({ kind: "external" as const, data: e })),
    ];
    return items.sort(
      (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
    );
  }, [results, externalResults]);

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
            <SubButton onClick={() => router.back()}>
              <ArrowLeftIcon className="size-4" /> 返回
            </SubButton>
            {isOwner && (
              <SubButton onClick={() => { setAddDialogTab("event"); setExForm({ title: "", description: "", link: "", image: "" }); setAddDialogOpen(true); }}>
                <Plus className="size-4" /> 新增成果
              </SubButton>
            )}
          </Block>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>新增成果</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 border-b border-border pb-2 shrink-0">
                <Button
                  variant={addDialogTab === "event" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAddDialogTab("event")}
                >
                  <CalendarDays className="size-4" />
                  活動成果
                </Button>
                <Button
                  variant={addDialogTab === "external" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAddDialogTab("external")}
                >
                  <ExternalLink className="size-4" />
                  外部成果
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {addDialogTab === "event" && (
                  participatedEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">尚未加入任何活動</p>
                  ) : (
                    <div className="grid gap-2">
                      {participatedEvents.map((event) => (
                        <Button
                          key={event.id}
                          variant="outline"
                          className="justify-start"
                          disabled={creatingEventResultId !== null}
                          onClick={() => {
                            setAddDialogOpen(false);
                            createEventResult(event.id, event.slug);
                          }}
                        >
                          {creatingEventResultId === event.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CalendarDays className="size-4" />
                          )}
                          {event.name}
                        </Button>
                      ))}
                    </div>
                  )
                )}
                {addDialogTab === "external" && (
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
                    <Button
                      className="ml-auto"
                      onClick={async () => { await submitExternalResult(); setAddDialogOpen(false); }}
                      disabled={exSaving || !exForm.title.trim()}
                    >
                      {exSaving && <Loader2 className="size-4 animate-spin" />}
                      新增
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={exDialogOpen} onOpenChange={setExDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>編輯外部成果</DialogTitle>
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
                    儲存
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="w-full grid lg:grid-cols-3 gap-4">

            <div className="col-span-1 min-w-0">
              <Block className="relative w-full overflow-hidden">
                {isOwner && (
                  <div className="absolute top-6 right-6 z-10">
                    <SubButton onClick={() => setIsEditMode((v) => !v)}>
                      {isEditMode ? <EyeOff className="size-4" /> : <Pencil className="size-4" />}
                      {isEditMode ? "完成編輯" : "編輯資料"}
                    </SubButton>
                  </div>
                )}

                {canViewPrivateProfile && (
                  <div className="flex flex-col items-center gap-2">
                    <Avatar size="3xl">
                      {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayNameValue} />}
                      <AvatarFallback>{displayNameValue.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    {isEditMode && (
                      <AppLink
                        href="https://gravatar.com/profile"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        前往 Gravatar 設定頭像
                      </AppLink>
                    )}
                  </div>
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
                    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{profile.bio}</p>
                  ) : null}

                  {!canViewPrivateProfile && (
                    <p className="text-sm text-muted-foreground">
                      其餘個人資訊僅限登入後查看。
                    </p>
                  )}
                </div>

                {isEditMode ? (
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      履歷
                      {(savingField === "resume" || uploadingResume) && (
                        <Loader2 className="size-3 animate-spin inline ml-1 text-muted-foreground" />
                      )}
                    </span>
                    {profile.resume ? (
                      <div className="grid gap-1.5">
                        <AppLink
                          href={`/profile/${profile.id}/resume?v=${profile.resume.split("/").pop() ?? ""}`}
                          className="text-sm text-foreground underline break-all"
                        >
                          /profile/{profile.id}/resume
                        </AppLink>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() => saveField("resume", null)}
                          disabled={savingField === "resume"}
                        >
                          <Trash2 className="size-4" />
                          移除履歷
                        </Button>
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
                      href={`/profile/${profile.id}/resume?v=${profile.resume.split("/").pop() ?? ""}`}
                      className="text-sm text-foreground underline"
                    >
                      查看履歷
                    </AppLink>
                  </div>
                ) : null}

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
                  <div className="grid gap-2 text-sm underline min-w-0">
                    {viewLinks.map(({ href, label }) => (
                      <AppLink key={href} href={href!} className="break-all">
                        {label}
                      </AppLink>
                    ))}
                  </div>
                ) : null}

              </Block>
            </div>

            <div className="col-span-1 lg:col-span-2 grid gap-4 content-start">

              {isOwner && isVendor && <VendorEventsSection />}

              {mergedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">尚無成果紀錄</p>
              ) : (
                mergedItems.map((item) => {
                  if (item.kind === "result") {
                    const result = item.data;
                    const eventName = result.event_id ? eventNameMap[result.event_id] : null;
                    return (
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold break-keep">
                                {result.title || "(無標題)"}
                              </h3>
                              {eventName && (
                                <Badge variant="default">{eventName}</Badge>
                              )}
                              {isOwner && result.status === "draft" && (
                                <Badge variant="secondary">草稿</Badge>
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
                    );
                  }

                  const ext = item.data;
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold break-keep">{ext.title}</h3>
                          <Badge variant="outline">外部</Badge>
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
                })
              )}

            </div>
          </div>

        </div>
      </PageShell>
    </main>
  );
}
