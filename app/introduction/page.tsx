"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Introduction } from "@/lib/supabase/types";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function IntroductionPage() {
  const { user } = useAuth();
  const router = useRouter();
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

  const contentHtml =
    introduction?.content && Object.keys(introduction.content).length > 0
      ? generateHTML(introduction.content, [StarterKit])
      : "";

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 flex flex-col gap-8 mt-8">
      <div className="z-10 relative">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {introduction?.title || "國立陽明交通大學 人工智慧專責辦公室"}
        </h1>
        {user && (
          <Button
            variant="secondary"
            className="absolute right-0 top-0"
            onClick={() => router.push("/introduction/edit")}
          >
            <Pencil className="w-4 h-4" />
            編輯
          </Button>
        )}
      </div>
      {contentHtml && (
        <div
          className="prose prose-sm sm:prose-base max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </div>
  );
}