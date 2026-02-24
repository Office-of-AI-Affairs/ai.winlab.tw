"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Plus, Trash2, Trophy, Link2 } from "lucide-react";
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

          <Separator />

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4" />
                社群連結
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
              <p className="text-sm text-muted-foreground">尚未新增社群連結</p>
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

      {/* TODO: 隊伍功能暫時隱藏 */}
      {/* Pending invitations */}
      {/* {invitations.length > 0 && ( ... )} */}

      {/* TODO: 隊伍功能暫時隱藏 */}
      {/* Teams */}
      {/* <Card> ... 我的隊伍 ... </Card> */}

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
                      {item.status === "published" ? "已發佈" : "草稿"}
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
