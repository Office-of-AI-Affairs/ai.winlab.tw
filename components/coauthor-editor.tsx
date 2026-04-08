"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { PublicProfile } from "@/lib/supabase/types";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  resultId: string;
  authorId: string | null;
  initialCoauthors: PublicProfile[];
};

export function CoauthorEditor({ resultId, authorId, initialCoauthors }: Props) {
  const supabaseRef = useRef(createClient());
  const [coauthors, setCoauthors] = useState<PublicProfile[]>(initialCoauthors);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const coauthorIdsRef = useRef(new Set(coauthors.map((c) => c.id)));
  coauthorIdsRef.current = new Set(coauthors.map((c) => c.id));

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    const { data } = await supabaseRef.current
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name")
      .ilike("display_name", `%${q.trim()}%`)
      .limit(10);
    const filtered = (data ?? []).filter(
      (p) => p.id !== authorId && !coauthorIdsRef.current.has(p.id)
    ) as PublicProfile[];
    setResults(filtered);
    setShowDropdown(true);
    setSearching(false);
  }, [authorId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function addCoauthor(profile: PublicProfile) {
    setAdding(profile.id);
    const { error } = await supabaseRef.current
      .from("result_coauthors")
      .insert({ result_id: resultId, user_id: profile.id });
    if (error) {
      toast.error("無法新增共同作者");
    } else {
      setCoauthors((prev) => [...prev, profile]);
      toast.success(`已新增 ${profile.display_name || "使用者"} 為共同作者`);
    }
    setAdding(null);
    setQuery("");
    setShowDropdown(false);
  }

  async function removeCoauthor(userId: string) {
    setRemoving(userId);
    const { error } = await supabaseRef.current
      .from("result_coauthors")
      .delete()
      .eq("result_id", resultId)
      .eq("user_id", userId);
    if (error) {
      toast.error("無法移除共同作者");
    } else {
      setCoauthors((prev) => prev.filter((c) => c.id !== userId));
      toast.success("已移除共同作者");
    }
    setRemoving(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm mx-2">共同作者</Label>

      {coauthors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {coauthors.map((ca) => (
            <div
              key={ca.id}
              className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm"
            >
              <Link href={`/profile/${ca.id}`} className="hover:underline underline-offset-4">
                {ca.display_name || "未知使用者"}
              </Link>
              <button
                type="button"
                onClick={() => removeCoauthor(ca.id)}
                disabled={removing === ca.id}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                {removing === ca.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length) setShowDropdown(true); }}
            placeholder="搜尋使用者名稱…"
            className="pl-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {showDropdown && (
          <div className="absolute z-30 top-full mt-1 w-full bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {query.trim() ? "找不到符合的使用者" : "輸入名稱搜尋…"}
              </p>
            ) : (
              results.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => addCoauthor(profile)}
                  disabled={adding === profile.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <Avatar size="sm">
                    <AvatarFallback>
                      {(profile.display_name || "?").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1">
                    {profile.display_name || "未知使用者"}
                  </span>
                  {adding === profile.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <UserPlus className="size-4 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
