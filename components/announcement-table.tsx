"use client";

import { AppLink } from "@/components/app-link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Announcement } from "@/lib/supabase/types";

export function AnnouncementTable({
  announcements,
  getHref,
  showStatus = false,
}: {
  announcements: Announcement[];
  getHref: (item: Announcement) => string;
  showStatus?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted h-12">
            <TableHead
              className="text-base font-bold"
              style={{ paddingLeft: "1.25rem" }}
            >
              公告日期
            </TableHead>
            <TableHead className="text-base font-bold">類別</TableHead>
            <TableHead className="text-base font-bold whitespace-normal">標題</TableHead>
            {showStatus && (
              <TableHead className="text-base font-bold">狀態</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((item) => (
            <TableRow
              key={item.id}
              className="h-12 hover:bg-muted/60 transition-colors"
            >
              <TableCell colSpan={showStatus ? 4 : 3} className="p-0">
                <AppLink
                  href={getHref(item)}
                  className="grid min-h-12 w-full items-center text-base [grid-template-columns:8rem_7rem_minmax(0,1fr)] sm:[grid-template-columns:8rem_7rem_minmax(0,1fr)]"
                >
                  <span className="px-4 py-3" style={{ paddingLeft: "1.25rem" }}>
                    {item.date}
                  </span>
                  <span className="px-4 py-3">{item.category}</span>
                  <span className="min-w-0 px-4 py-3 whitespace-normal">
                    {item.title || "(無標題)"}
                  </span>
                  {showStatus && (
                    <span
                      className={`px-4 py-3 ${item.status === "published" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {item.status === "published" ? "已發布" : "草稿"}
                    </span>
                  )}
                </AppLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AnnouncementTableSkeleton({
  rows = 6,
  showStatus = false,
}: {
  rows?: number;
  showStatus?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted h-12">
            <TableHead className="text-base font-bold" style={{ paddingLeft: "1.25rem" }}>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="text-base font-bold">
              <Skeleton className="h-4 w-12" />
            </TableHead>
            <TableHead className="text-base font-bold whitespace-normal">
              <Skeleton className="h-4 w-20" />
            </TableHead>
            {showStatus && (
              <TableHead className="text-base font-bold">
                <Skeleton className="h-4 w-12" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index} className="h-12">
              <TableCell className="text-base" style={{ paddingLeft: "1.25rem" }}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="text-base">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="text-base whitespace-normal">
                <Skeleton className="h-4 w-full" />
              </TableCell>
              {showStatus && (
                <TableCell className="text-base">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
