"use client";

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
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function HomeAnnouncement() {
  const router = useRouter();
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "published")
        .order("date", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching announcements:", error);
      } else {
        setAnnouncements(data || []);
      }
      setIsLoading(false);
    };

    fetchAnnouncements();
  }, [supabase]);

  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-6">
      <h2 className="text-2xl font-bold">最新公告</h2>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer h-12"
                onClick={() => router.push(`/announcement/${item.id}`)}
              >
                <TableCell className="text-base">{item.date}</TableCell>
                <TableCell className="text-base">{item.category}</TableCell>
                <TableCell className="text-base">
                  {item.title || "(無標題)"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex justify-center">
        <Link href="/announcement">
          <Button variant="secondary" size="lg" className="px-12 text-lg">
            探索更多
          </Button>
        </Link>
      </div>
    </div>
  );
}