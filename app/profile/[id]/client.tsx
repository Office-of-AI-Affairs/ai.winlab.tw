"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isExternalImage } from "@/lib/utils";
import type { Profile, Result } from "@/lib/supabase/types";
import {
  EyeOff,
  Pencil,
  Facebook,
  FileText,
  Github,
  Globe,
  Link2,
  Linkedin,
  Loader2,
  Plus,
  Trash2,
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
  const [savingField, setSavingField] = useState<string | null>(null);

  // Edit form state
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [linkedin, setLinkedin] = useState(initialProfile.linkedin ?? "");
  const [facebook, setFacebook] = useState(initialProfile.facebook ?? "");
  const [github, setGithub] = useState(initialProfile.github ?? "");
  const [website, setWebsite] = useState(initialProfile.website ?? "");
  const [resume, setResume] = useState(initialProfile.resume ?? "");
  const [socialLinks, setSocialLinks] = useState<string[]>((initialProfile.social_links as string[]) ?? []);

  const saveField = async (field: string, value: string | null) => {
    if (!user) return;
    setSavingField(field);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ [field]: value || null })
      .eq("id", user.id);
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

  const saveExtraLinks = async (links: string[]) => {
    if (!user) return;
    setSavingField("social_links");
    const supabase = createClient();
    const filtered = links.filter((l) => l.trim() !== "");
    await supabase
      .from("profiles")
      .update({ social_links: filtered })
      .eq("id", user.id);
    setSocialLinks(filtered);
    setSavingField(null);
  };

  const addSocialLink = () => setSocialLinks((prev) => [...prev, ""]);
  const updateSocialLink = (idx: number, val: string) =>
    setSocialLinks((prev) => prev.map((l, i) => (i === idx ? val : l)));
  const socialFields = [
    { key: "linkedin" as const, label: "LinkedIn", icon: Linkedin, value: linkedin, setter: setLinkedin },
    { key: "facebook" as const, label: "Facebook", icon: Facebook, value: facebook, setter: setFacebook },
    { key: "github" as const, label: "GitHub", icon: Github, value: github, setter: setGithub },
    { key: "website" as const, label: "個人網站", icon: Globe, value: website, setter: setWebsite },
    { key: "resume" as const, label: "履歷連結", icon: FileText, value: resume, setter: setResume },
  ];

  function safeHref(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
  }

  const displayNameValue = profile.display_name || "未知使用者";
  const structuredLinks = [
    { key: "linkedin", label: "LinkedIn", href: safeHref(profile.linkedin), icon: Linkedin },
    { key: "facebook", label: "Facebook", href: safeHref(profile.facebook), icon: Facebook },
    { key: "github", label: "GitHub", href: safeHref(profile.github), icon: Github },
    { key: "website", label: "個人網站", href: safeHref(profile.website), icon: Globe },
    { key: "resume", label: "履歷", href: safeHref(profile.resume), icon: FileText },
  ].filter((l) => l.href);
  const extraLinks = (profile.social_links as string[]) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:gap-16">
          {/* LEFT COLUMN */}
          <aside className="md:w-72 shrink-0 md:sticky md:top-20 md:self-start mb-10 md:mb-0">
            {/* Edit toggle — owner only */}
            {isOwner && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditMode((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isEditMode ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Pencil className="w-4 h-4 mr-1.5" />}
                  {isEditMode ? "完成編輯" : "編輯資料"}
                </Button>
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayNameValue}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                {isEditMode ? (
                  <div className="relative">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={() => saveField("display_name", displayName)}
                      className="text-2xl font-bold text-center bg-transparent border-b border-border focus:border-foreground outline-none w-full pb-0.5"
                      placeholder="請輸入姓名"
                    />
                    {savingField === "display_name" && (
                      <Loader2 className="w-3 h-3 animate-spin absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold">{displayNameValue}</h1>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {results.filter((r) => r.status === "published").length} 篇個人成果
                </p>
              </div>
            </div>

            {/* Bio */}
            {isEditMode ? (
              <div className="relative mb-5">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={() => saveField("bio", bio)}
                  rows={4}
                  className="w-full text-sm leading-relaxed bg-transparent border-b border-border focus:border-foreground outline-none resize-none pb-0.5"
                  placeholder="簡單介紹一下自己..."
                />
                {savingField === "bio" && (
                  <Loader2 className="w-3 h-3 animate-spin absolute right-0 top-0 text-muted-foreground" />
                )}
              </div>
            ) : profile.bio ? (
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap mb-5">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-5">尚未填寫自我介紹</p>
            )}

            {/* Social links */}
            {isEditMode ? (
              <div className="flex flex-col gap-2 mb-4">
                {socialFields.map(({ key, label, icon: Icon, value, setter }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <div className="relative flex-1">
                      <input
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        onBlur={() => saveField(key, value)}
                        placeholder={`${label} 網址`}
                        className="w-full text-sm bg-transparent border-b border-border focus:border-foreground outline-none pb-0.5 pr-5"
                      />
                      {savingField === key && (
                        <Loader2 className="w-3 h-3 animate-spin absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : structuredLinks.length > 0 ? (
              <div className="flex flex-wrap gap-3 mb-4">
                {structuredLinks.map(({ key, label, href, icon: Icon }) => (
                  <a
                    key={key}
                    href={href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            ) : null}

            {/* Extra links */}
            {isEditMode ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    額外連結
                    {savingField === "social_links" && (
                      <Loader2 className="w-3 h-3 animate-spin ml-1 text-muted-foreground" />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    新增
                  </button>
                </div>
                {socialLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      value={link}
                      onChange={(e) => updateSocialLink(idx, e.target.value)}
                      onBlur={(e) => {
                        const next = socialLinks.map((l, i) => i === idx ? e.target.value : l);
                        saveExtraLinks(next);
                      }}
                      placeholder="https://..."
                      className="flex-1 text-sm bg-transparent border-b border-border focus:border-foreground outline-none pb-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = socialLinks.filter((_, i) => i !== idx);
                        setSocialLinks(next);
                        saveExtraLinks(next);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {socialLinks.length === 0 && (
                  <p className="text-xs text-muted-foreground">尚未新增</p>
                )}
              </div>
            ) : extraLinks.length > 0 ? (
              <div className="flex flex-col gap-1">
                {extraLinks.map((url: string) => {
                  const safe = safeHref(url);
                  if (!safe) return null;
                  return (
                    <a
                      key={url}
                      href={safe}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline underline-offset-2 truncate hover:opacity-80"
                    >
                      {url}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </aside>

          {/* RIGHT COLUMN */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">個人成果</h2>
              {isOwner && (
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增成果
                </Link>
              )}
            </div>

            {/* List */}
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">尚無成果紀錄</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={isOwner ? `/result/${result.id}/edit` : `/result/${result.id}`}
                    className="py-6 flex items-start justify-between gap-6 group"
                  >
                    {/* Text content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{result.date}</span>
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
                      <h3 className="text-xl font-bold line-clamp-2 group-hover:underline underline-offset-2">
                        {result.title || "(無標題)"}
                      </h3>
                      {result.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.summary}
                        </p>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {result.header_image && result.header_image !== "/placeholder.png" && (
                      <div className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
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
          </main>
        </div>
    </div>
  );
}
