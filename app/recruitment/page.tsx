"use client";

import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/components/auth-provider";
import { RecruitmentCard } from "@/components/recruitment-card";
import { RecruitmentDialog } from "@/components/recruitment-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Recruitment } from "@/lib/supabase/types";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function RecruitmentPage() {
  const { isAdmin } = useAuth();
  const supabase = createClient();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecruitments() {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .is("event_id", null)
        .order("start_date", { ascending: false });

      if (error) {
        console.error("Error fetching recruitments:", error);
      } else if (!cancelled) {
        setRecruitments(data || []);
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void loadRecruitments();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const openCreateSheet = () => { setEditingRecruitment(null); setSheetOpen(true); };
  const openEditSheet = (r: Recruitment) => { setEditingRecruitment(r); setSheetOpen(true); };

  return (
    <PageShell>
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

      <RecruitmentDialog open={sheetOpen} onOpenChange={setSheetOpen} recruitment={editingRecruitment} eventId={null} />
    </PageShell>
  );
}
