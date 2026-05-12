"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UploadFn = (file: File) => Promise<{ url: string } | { error: string }>;

export function useImageUpload(uploadFn: UploadFn) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFnRef = useRef(uploadFn);

  useEffect(() => {
    uploadFnRef.current = uploadFn;
  }, [uploadFn]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<string | null> => {
      const file = e.target.files?.[0];
      if (!file) return null;

      setIsUploading(true);
      const result = await uploadFnRef.current(file);
      e.target.value = "";
      setIsUploading(false);

      if ("error" in result) {
        toast.error(result.error);
        return null;
      }
      return result.url;
    },
    [],
  );

  return { isUploading, fileInputRef, triggerFileInput, handleFileChange };
}
