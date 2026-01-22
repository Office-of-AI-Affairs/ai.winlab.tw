"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/supabase/types";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AnnouncementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    const query = supabase
      .from("announcements")
      .select("*")
      .order("date", { ascending: false });

    // If user is logged in, show all; otherwise only published
    if (!user) {
      query.eq("status", "published");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching announcements:", error);
    } else {
      setAnnouncements(data || []);
    }
    setIsLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async () => {
    if (!user) return;

    setIsCreating(true);
    const { data, error } = await supabase
      .from("announcements")
      .insert({
        title: "新公告",
        category: "一般",
        content: {},
        status: "draft",
        author_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating announcement:", error);
      setIsCreating(false);
      return;
    }

    router.push(`/announcement/${data.id}/edit`);
  };

  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-8 mt-8">
      <div className="z-10 relative">
        <h1 className="text-3xl font-bold w-full text-center">最新公告</h1>
        {user && (
          <Button
            variant="secondary"
            className="absolute right-0 top-0"
            onClick={handleCreateAnnouncement}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            新增公告
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          目前沒有公告
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted h-12">
              <TableHead className="text-base font-bold">公告日期</TableHead>
              <TableHead className="text-base font-bold">類別</TableHead>
              <TableHead className="text-base font-bold">標題</TableHead>
              {user && (
                <TableHead className="text-base font-bold">狀態</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer h-12"
                onClick={() =>
                  router.push(
                    user
                      ? `/announcement/${item.id}/edit`
                      : `/announcement/${item.id}`
                  )
                }
              >
                <TableCell className="text-base">{item.date}</TableCell>
                <TableCell className="text-base">{item.category}</TableCell>
                <TableCell className="text-base">
                  {item.title || "(無標題)"}
                </TableCell>
                {user && (
                  <TableCell className="text-base">
                    <span
                      className={
                        item.status === "published"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    >
                      {item.status === "published" ? "已發布" : "草稿"}
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}