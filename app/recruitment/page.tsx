"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Recruitment } from "@/lib/supabase/types";
import { Loader2, Link2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function RecruitmentPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchRecruitments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .order("date", { ascending: false });
    if (error) console.error("Error fetching recruitments:", error);
    else setRecruitments(data || []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(true);
    const { data, error } = await supabase
      .from("competitions")
      .insert({ title: "新企業徵才", link: "", image: "/placeholder.png", date: new Date().toISOString().slice(0, 10), description: null, location: null, positions: null })
      .select()
      .single();
    if (error) { setIsCreating(false); return; }
    router.push(`/recruitment/${data.id}/edit`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">企業徵才</h1>
        {isAdmin && (
          <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新增
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : recruitments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">目前沒有企業徵才資訊</div>
      ) : (
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
          {recruitments.map((item) => {
            const card = (
              <Card className="py-0 h-full flex flex-col transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                <div className="relative w-full aspect-video">
                  <Image
                    src={item.image || "/placeholder.png"}
                    alt={item.title}
                    fill
                    className="object-cover"
                    unoptimized={!!(item.image && (item.image.startsWith("http://") || item.image.startsWith("https://")))}
                  />
                  <div className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white pointer-events-none" aria-hidden>
                    <Link2 className="w-4 h-4" />
                  </div>
                </div>
                <CardHeader className="pb-4 flex-1 flex flex-col gap-2">
                  <CardTitle className="text-xl font-bold">{item.title || "(無標題)"}</CardTitle>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  {item.positions && item.positions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.positions.map((pos, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium">
                          {pos.name}
                          {pos.location && <span className="text-muted-foreground">· {pos.location}</span>}
                          <span className="text-muted-foreground">× {pos.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>
              </Card>
            );

            return isAdmin ? (
              <button type="button" key={item.id} className="text-left w-full"
                onClick={() => router.push(`/recruitment/${item.id}/edit`)}>
                {card}
              </button>
            ) : (
              <Link href={item.link || "#"} key={item.id} target="_blank" rel="noopener noreferrer">
                {card}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
