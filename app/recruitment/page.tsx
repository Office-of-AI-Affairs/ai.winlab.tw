"use client";

import { useAuth } from "@/components/auth-provider";
import { RecruitmentCard } from "@/components/recruitment-card";
import { RecruitmentSheet } from "@/components/recruitment-sheet";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Recruitment } from "@/lib/supabase/types";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function RecruitmentPage() {
  const { isAdmin } = useAuth();
  const supabase = createClient();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null);

  const fetchRecruitments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .is("event_id", null)
      .order("start_date", { ascending: false });
    if (error) console.error("Error fetching recruitments:", error);
    else setRecruitments(data || []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

  const openCreateSheet = () => { setEditingRecruitment(null); setSheetOpen(true); };
  const openEditSheet = (r: Recruitment) => { setEditingRecruitment(r); setSheetOpen(true); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">企業徵才</h1>
        {isAdmin && (
          <Button variant="secondary" onClick={openCreateSheet}>
            <Plus className="w-4 h-4" />
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
          {recruitments.map((item) => (
            <Link href={`/recruitment/${item.id}`} key={item.id} className="h-full">
              <RecruitmentCard item={item} onEdit={isAdmin ? () => openEditSheet(item) : undefined} />
            </Link>
          ))}
        </div>
      )}

      <RecruitmentSheet open={sheetOpen} onOpenChange={setSheetOpen} recruitment={editingRecruitment} eventId={null} />
    </div>
  );
}
