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
import type { Result } from "@/lib/supabase/types";
import {
  FileText,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Link2,
  Facebook,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AccountPage() {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [facebook, setFacebook] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");
  const [resume, setResume] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Results
  const [results, setResults] = useState<Result[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
      setBio(profile.bio ?? "");
      setLinkedin(profile.linkedin ?? "");
      setFacebook(profile.facebook ?? "");
      setGithub(profile.github ?? "");
      setWebsite(profile.website ?? "");
      setResume(profile.resume ?? "");
      setSocialLinks(profile.social_links ?? []);
    }
  }, [profile]);

  const fetchMyResults = useCallback(async () => {
    if (!user) return;
    setIsLoadingResults(true);
    const { data } = await supabase
      .from("results")
      .select("*")
      .eq("author_id", user.id)
      .eq("type", "personal")
      .order("date", { ascending: false });
    setResults((data as Result[]) || []);
    setIsLoadingResults(false);
  }, [supabase, user]);

  useEffect(() => {
    if (user) {
      fetchMyResults();
    }
  }, [user, fetchMyResults]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
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
    setIsSaving(false);
  };

  const addSocialLink = () => setSocialLinks((prev) => [...prev, ""]);
  const updateSocialLink = (idx: number, val: string) =>
    setSocialLinks((prev) => prev.map((l, i) => (i === idx ? val : l)));
  const removeSocialLink = (idx: number) =>
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));

  const isExternalImage = (src: string | null | undefined) =>
    !!(src && (src.startsWith("http://") || src.startsWith("https://")));

  if (authLoading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <h1 className="text-3xl font-bold">帳號設定</h1>

      {/* Profile */}
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
              <Input value={user.email ?? ""} disabled className="bg-muted" />
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

          {/* Structured social links */}
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

          {/* Extra links */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4" />
                額外連結
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addSocialLink}
              >
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

          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full sm:w-auto self-start">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            儲存變更
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            我的活動成果
          </CardTitle>
          <CardDescription>您的個人活動成果</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingResults ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無活動成果紀錄</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/result/${item.id}/edit`}
                  className="group block rounded-lg border overflow-hidden transition-transform duration-200 hover:scale-[1.01] hover:shadow-sm"
                >
                  <div className="relative w-full aspect-video bg-muted">
                    <Image
                      src={item.header_image || "/placeholder.png"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized={isExternalImage(item.header_image)}
                    />
                    <span
                      className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                        item.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status === "published" ? "已發布" : "草稿"}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="font-medium line-clamp-2 text-sm">
                      {item.title || "(無標題)"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.date || "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link href="/result">
              <Button variant="secondary" className="w-full sm:w-auto">
                前往活動成果頁面
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
