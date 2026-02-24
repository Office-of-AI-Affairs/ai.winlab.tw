import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/supabase/types";
import { ArrowLeft, Link2, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileRes, resultsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, phone, social_links")
      .eq("id", id)
      .single(),
    supabase
      .from("results")
      .select("*")
      .eq("author_id", id)
      .eq("status", "published")
      .eq("type", "personal")
      .order("date", { ascending: false }),
    // TODO: 隊伍功能暫時隱藏
    // supabase.from("team_members").select("team_id").eq("user_id", id),
  ]);

  if (profileRes.error || !profileRes.data) notFound();

  const profile = profileRes.data;
  const results = (resultsRes.data as Result[]) || [];
  // TODO: 隊伍功能暫時隱藏
  // const teamIds = (membersRes.data || []).map((m) => m.team_id);
  // let teams: Team[] = [];
  // if (teamIds.length > 0) {
  //   const { data } = await supabase.from("teams").select("*").in("id", teamIds);
  //   teams = (data as Team[]) || [];
  // }

  const displayName = profile.display_name || "未知使用者";
  const socialLinks = profile.social_links || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link
        href="/result"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {results.length} 篇個人成果
          </p>
        </div>
      </div>

      {/* Profile details */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle>個人資訊</CardTitle>
          <CardDescription>姓名與聯絡方式</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-4 sm:grid-cols-1">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <dt className="text-sm font-medium text-muted-foreground">姓名</dt>
                <dd className="mt-0.5">{displayName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <dt className="text-sm font-medium text-muted-foreground">電子信箱</dt>
                <dd className="mt-0.5 text-muted-foreground">未公開</dd>
              </div>
            </div>
            {(profile.phone ?? "").trim() !== "" && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">手機</dt>
                  <dd className="mt-0.5">{profile.phone}</dd>
                </div>
              </div>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-start gap-3">
                <Link2 className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">社群連結</dt>
                  <dd className="mt-0.5 flex flex-col gap-1">
                    {socialLinks.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 break-all hover:opacity-80"
                      >
                        {url}
                      </a>
                    ))}
                  </dd>
                </div>
              </div>
            )}
            {/* TODO: 隊伍功能暫時隱藏 */}
          </dl>
        </CardContent>
      </Card>

      {/* Results list */}
      <h2 className="text-lg font-semibold mb-4">個人成果</h2>
      {results.length === 0 ? (
        <p className="text-muted-foreground">尚無已發布的成果。</p>
      ) : (
        <div className="flex flex-col divide-y">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/result/${result.id}`}
              className="py-6 group flex flex-col gap-1 hover:bg-muted/30 -mx-4 px-4 transition-colors rounded-lg"
            >
              <p className="text-sm text-muted-foreground">{result.date}</p>
              <h3 className="text-xl font-semibold group-hover:underline underline-offset-2">
                {result.title}
              </h3>
              {result.summary && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {result.summary}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
