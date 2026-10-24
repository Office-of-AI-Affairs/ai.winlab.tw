"use client";

import { AppLink } from "@/components/shared/app-link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/layout/auth-provider";
import { listMyRecruitments, type OwnedRecruitment } from "@/lib/actions/recruitment";
import { useT } from "@/lib/i18n/locale-provider";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function VendorEventsSection() {
  const t = useT();
  const { user } = useAuth();
  const [recruitments, setRecruitments] = useState<OwnedRecruitment[] | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchOwnedRecruitments() {
      const rows = await listMyRecruitments().catch((error) => {
        console.error("Failed to fetch owned recruitments:", error);
        toast.error(t.profile.loadRecruitmentsError);
        return [];
      });
      setRecruitments(rows);
    }
    fetchOwnedRecruitments();
  }, [user, t]);

  const loading = user !== null && recruitments === null;

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t.profile.managedRecruitments}</h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 grid gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !recruitments || recruitments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t.profile.noOwnedRecruitments}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recruitments.map((item) => (
            <AppLink
              key={item.id}
              href={`/events/${item.event_slug}/recruitment/${item.id}`}
              className="block interactive-scale"
            >
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="relative aspect-video w-full bg-muted">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-primary" />
                  )}
                </div>
                <div className="p-4 grid gap-2">
                  <p className="font-medium line-clamp-2">{item.title}</p>
                  <div>
                    <Badge variant="secondary">{item.event_name}</Badge>
                  </div>
                </div>
              </div>
            </AppLink>
          ))}
        </div>
      )}
    </div>
  );
}
