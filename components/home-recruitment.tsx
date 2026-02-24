"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Recruitment } from "@/lib/supabase/types";
import { Loader2, Link2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeRecruitment() {
  const supabase = createClient();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecruitments = async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("date", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching recruitments:", error);
      } else {
        setRecruitments(data || []);
      }
      setIsLoading(false);
    };

    fetchRecruitments();
  }, [supabase]);

  return (
    <div className="bg-muted/40 py-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">企業徵才</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : recruitments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            目前沒有企業徵才資訊
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
            {recruitments.map((item) => (
              <Link
                href={item.link || "#"}
                key={item.id}
                target={item.link ? "_blank" : undefined}
                rel={item.link ? "noopener noreferrer" : undefined}
              >
                <Card className="py-0 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                  <div className="relative w-full aspect-video">
                    <Image
                      src={item.image || "/placeholder.png"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized={isExternalUrl(item.image)}
                    />
                    <div className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white pointer-events-none" aria-hidden>
                      <Link2 className="w-4 h-4" />
                    </div>
                  </div>
                  <CardHeader className="pb-4 flex flex-col gap-2">
                    <CardTitle className="text-xl font-bold">{item.title}</CardTitle>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    {item.positions && item.positions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
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
              </Link>
            ))}
          </div>
        )}
        <div className="flex justify-center">
          <Link href="/recruitment">
            <Button variant="secondary" size="lg" className="px-12 text-lg">
              探索更多
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function isExternalUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  return src.startsWith("http://") || src.startsWith("https://");
}
