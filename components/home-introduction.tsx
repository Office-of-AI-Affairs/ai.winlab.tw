"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Introduction } from "@/lib/supabase/types";
import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeIntroduction() {
  const supabase = createClient();
  const [introduction, setIntroduction] = useState<Introduction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntroduction = async () => {
      const { data, error } = await supabase
        .from("introduction")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching introduction:", error);
      } else {
        setIntroduction(data);
      }
      setIsLoading(false);
    };

    fetchIntroduction();
  }, [supabase]);

  // Extract plain text from content and truncate
  const contentText =
    introduction?.content && Object.keys(introduction.content).length > 0
      ? generateText(introduction.content, [StarterKit])
      : "";

  const truncatedText = contentText.length > 150
    ? contentText.slice(0, 150) + "..."
    : contentText;

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-4 flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 flex flex-col gap-6">
      <h2 className="text-2xl font-bold">
        {introduction?.title || "國立陽明交通大學人工智慧專責辦公室"}
      </h2>
      {truncatedText && (
        <p className="text-lg text-muted-foreground">
          {truncatedText}
        </p>
      )}
      <div className="flex justify-center">
        <Link href="/introduction">
          <Button variant="secondary" size="lg" className="px-12 text-lg">探索更多</Button>
        </Link>
      </div>
    </div>
  );
}