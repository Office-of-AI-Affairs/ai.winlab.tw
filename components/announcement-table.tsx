"use client";

import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/date";
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
            <TableHead className="py-3 text-base font-bold">
              公告日期
            </TableHead>
            <TableHead className="py-3 text-base font-bold">類別</TableHead>
            <TableHead className="py-3 text-base font-bold whitespace-normal">標題</TableHead>
            {showStatus && (
              <TableHead className="py-3 text-base font-bold">狀態</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((item) => (
            <TableRow
              key={item.id}
              className="h-12 hover:bg-muted/60 transition-colors"
            >
              <TableCell className="p-0 text-base">
                <AppLink
                  href={getHref(item)}
                  className="flex min-h-12 w-full items-center px-4 py-3"
                >
                  {formatDate(item.date)}
                </AppLink>
              </TableCell>
              <TableCell className="p-0 text-base">
                <AppLink
                  href={getHref(item)}
                  className="flex min-h-12 w-full items-center px-4 py-3"
                >
                  {item.category}
                </AppLink>
              </TableCell>
              <TableCell className="p-0 text-base whitespace-normal">
                <AppLink
                  href={getHref(item)}
                  className="flex min-h-12 w-full items-center px-4 py-3 whitespace-normal"
                >
                  {item.title || "(無標題)"}
                </AppLink>
              </TableCell>
              {showStatus && (
                <TableCell className="p-0 text-base">
                  <AppLink
                    href={getHref(item)}
                    className="flex min-h-12 w-full items-center px-4 py-3"
                  >
                    <Badge variant={item.status === "published" ? "default" : "secondary"}>
                      {item.status === "published" ? "已發布" : "草稿"}
                    </Badge>
                  </AppLink>
                </TableCell>
              )}
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
            <TableHead className="py-3 text-base font-bold">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="py-3 text-base font-bold">
              <Skeleton className="h-4 w-12" />
            </TableHead>
            <TableHead className="py-3 text-base font-bold whitespace-normal">
              <Skeleton className="h-4 w-20" />
            </TableHead>
            {showStatus && (
              <TableHead className="py-3 text-base font-bold">
                <Skeleton className="h-4 w-12" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index} className="h-12">
              <TableCell className="py-3 text-base">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="py-3 text-base">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="py-3 text-base whitespace-normal">
                <Skeleton className="h-4 w-full" />
              </TableCell>
              {showStatus && (
                <TableCell className="py-3 text-base">
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
