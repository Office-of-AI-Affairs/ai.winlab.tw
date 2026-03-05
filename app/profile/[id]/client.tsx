"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { isExternalImage } from "@/lib/utils";
import type { Profile, Result } from "@/lib/supabase/types";
import {
  Eye,
  EyeOff,
  Facebook,
  FileText,
  Github,
  Globe,
  Link2,
  Linkedin,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function ProfilePageClient({
  initialProfile,
  results,
  isOwner,
}: {
  initialProfile: Profile;
  results: Result[];
  isOwner: boolean;
}) {
  const { user, refreshProfile } = useAuth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [linkedin, setLinkedin] = useState(initialProfile.linkedin ?? "");
  const [facebook, setFacebook] = useState(initialProfile.facebook ?? "");
  const [github, setGithub] = useState(initialProfile.github ?? "");
  const [website, setWebsite] = useState(initialProfile.website ?? "");
  const [resume, setResume] = useState(initialProfile.resume ?? "");
  const [socialLinks, setSocialLinks] = useState<string[]>((initialProfile.social_links as string[]) ?? []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        phone: phone || null,
        bio: bio || null,
        linkedin: linkedin || null,
        facebook: facebook || null,
        github: github || null,
        website: website || null,
        resume: resume || null,
        social_links: socialLinks.filter((l) => l.trim() !== ""),
      })
      .eq("id", user.id);
    await refreshProfile();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, phone, linkedin, facebook, github, website, resume, social_links")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as Profile);
    setIsSaving(false);
  };

  const addSocialLink = () => setSocialLinks((prev) => [...prev, ""]);
  const updateSocialLink = (idx: number, val: string) =>
    setSocialLinks((prev) => prev.map((l, i) => (i === idx ? val : l)));
  const removeSocialLink = (idx: number) =>
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));

  const displayNameValue = profile.display_name || "未知使用者";
  const structuredLinks = [
    { key: "linkedin", label: "LinkedIn", href: profile.linkedin, icon: Linkedin },
    { key: "facebook", label: "Facebook", href: profile.facebook, icon: Facebook },
    { key: "github", label: "GitHub", href: profile.github, icon: Github },
    { key: "website", label: "個人網站", href: profile.website, icon: Globe },
    { key: "resume", label: "履歷", href: profile.resume, icon: FileText },
  ].filter((l) => l.href);
  const extraLinks = (profile.social_links as string[]) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      {/* Top bar */}
      <div className="flex items-center justify-end gap-4">
        {isOwner && (
          <Button
            variant={isEditMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsEditMode((v) => !v)}
          >
            {isEditMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isEditMode ? "預覽" : "編輯"}
          </Button>
        )}
      </div>

      {isEditMode && isOwner ? (
        /* ── Edit Mode ─────────────────────────────────────────── */
        <Card>
          <CardHeader>
            <CardTitle>基本資料</CardTitle>
            <CardDescription>編輯您的個人資訊</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>姓名</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="請輸入姓名"
                />
              </div>
              <div className="grid gap-2">
                <Label>電子信箱</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>手機號碼</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="請輸入手機號碼"
                  type="tel"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>自我介紹</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="簡單介紹一下自己..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Separator />

            <div className="grid gap-3">
              <Label>社群連結</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="LinkedIn 個人頁網址"
                    type="url"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="Facebook 個人頁網址"
                    type="url"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="GitHub 個人頁網址"
                    type="url"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="個人網站網址"
                    type="url"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    placeholder="履歷連結（Google Drive、PDF 等）"
                    type="url"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  額外連結
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={addSocialLink}>
                  <Plus className="w-4 h-4" />
                  新增連結
                </Button>
              </div>
              {socialLinks.length === 0 && (
                <p className="text-sm text-muted-foreground">尚未新增額外連結</p>
              )}
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(e) => updateSocialLink(idx, e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocialLink(idx)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full sm:w-auto self-start"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              儲存變更
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Preview / Public Mode ──────────────────────────────── */
        <>
          {/* Profile header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayNameValue}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{displayNameValue}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {results.filter((r) => r.status === "published").length} 篇個人成果
              </p>
            </div>
          </div>

          {/* Profile details */}
          <Card>
            <CardHeader>
              <CardTitle>個人資訊</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {profile.bio && (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
              {structuredLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {structuredLinks.map(({ key, label, href, icon: Icon }) => (
                    <a
                      key={key}
                      href={href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </a>
                  ))}
                </div>
              )}
              {extraLinks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    額外連結
                  </p>
                  <div className="flex flex-col gap-1">
                    {extraLinks.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline underline-offset-2 break-all hover:opacity-80"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {!profile.bio && structuredLinks.length === 0 && extraLinks.length === 0 && (
                <p className="text-sm text-muted-foreground">尚未填寫個人資訊</p>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              個人成果
            </h2>
            {results.length === 0 ? (
              <p className="text-muted-foreground text-sm">尚無成果紀錄。</p>
            ) : (
              <div className="flex flex-col divide-y">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={isOwner ? `/result/${result.id}/edit` : `/result/${result.id}`}
                    className="py-6 group flex flex-col gap-1 hover:bg-muted/30 -mx-4 px-4 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{result.date}</p>
                      {isOwner && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            result.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {result.status === "published" ? "已發布" : "草稿"}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold group-hover:underline underline-offset-2">
                      {result.title || "(無標題)"}
                    </h3>
                    {result.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {result.summary}
                      </p>
                    )}
                    {result.header_image && (
                      <div className="relative w-full max-w-xs aspect-video rounded-md overflow-hidden bg-muted mt-2">
                        <Image
                          src={result.header_image}
                          alt={result.title}
                          fill
                          className="object-cover"
                          unoptimized={isExternalImage(result.header_image)}
                        />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
