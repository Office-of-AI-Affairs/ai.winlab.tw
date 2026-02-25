"use client";

import { IntroductionDetail } from "@/components/introduction-detail";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Introduction } from "@/lib/supabase/types";
import Image from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function IntroductionPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [introduction, setIntroduction] = useState<Introduction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntroduction = async () => {
      const { data, error } = await supabase.from("introduction").select("*").single();
      if (error) console.error("Error fetching introduction:", error);
      else setIntroduction(data);
      setIsLoading(false);
    };
    fetchIntroduction();
  }, [supabase]);

  const contentHtml = useMemo(
    () =>
      introduction?.content && Object.keys(introduction.content).length > 0
        ? generateHTML(introduction.content, [
            StarterKit,
            Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
            Youtube,
          ])
        : "",
    [introduction?.content]
  );

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <IntroductionDetail
        title={introduction?.title || "國立陽明交通大學 人工智慧專責辦公室"}
        contentHtml={contentHtml}
        actions={
          isAdmin ? (
            <Button variant="secondary" onClick={() => router.push("/introduction/edit")}>
              <Pencil className="w-4 h-4" />
              編輯
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
