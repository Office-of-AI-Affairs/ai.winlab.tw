"use client";

import { createClient } from "@/lib/supabase/client";
import type { ExternalResult, Profile } from "@/lib/supabase/types";
import { uploadExternalResultImage, uploadResumePdf } from "@/lib/upload-image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function mergeAllLinks(profile: Profile): string[] {
  const structured = [
    profile.linkedin,
    profile.facebook,
    profile.github,
    profile.website,
  ].filter(Boolean) as string[];
  const extra = (profile.social_links as string[] | null) ?? [];
  const seen = new Set<string>();
  return [...structured, ...extra].filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

type Options = {
  userId: string | null;
  initialProfile: Profile;
  initialExternalResults: ExternalResult[];
  refreshProfile: () => Promise<void>;
};

export function useProfileEditor({
  userId,
  initialProfile,
  initialExternalResults,
  refreshProfile,
}: Options) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const refreshProfileRef = useRef(refreshProfile);
  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
  }, [refreshProfile]);

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(
    initialProfile.display_name ?? "",
  );
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [links, setLinks] = useState<string[]>(() =>
    mergeAllLinks(initialProfile),
  );

  const [externalResults, setExternalResults] =
    useState<ExternalResult[]>(initialExternalResults);
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [exSaving, setExSaving] = useState(false);
  const [exUploadingImage, setExUploadingImage] = useState(false);
  const [exEditingId, setExEditingId] = useState<string | null>(null);
  const [exForm, setExForm] = useState({
    title: "",
    description: "",
    link: "",
    image: "",
  });
  const [uploadingResume, setUploadingResume] = useState(false);
  const [creatingEventResultId, setCreatingEventResultId] = useState<string | null>(null);

  const saveField = useCallback(
    async (field: string, value: string | null) => {
      if (!userId) return;
      setSavingField(field);
      const sb = supabaseRef.current;
      const { error: updateError } = await sb
        .from("profiles")
        .update({ [field]: value || null })
        .eq("id", userId);
      if (updateError) { toast.error("儲存失敗"); setSavingField(null); return; }
      const { data } = await sb
        .from("profiles")
        .select(
          "id, display_name, avatar_url, bio, phone, linkedin, facebook, github, website, resume, social_links",
        )
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data as Profile);
        await refreshProfileRef.current();
      }
      setSavingField(null);
    },
    [userId],
  );

  const saveLinks = useCallback(
    async (next: string[]) => {
      if (!userId) return;
      setSavingField("links");
      const filtered = next.filter((l) => l.trim() !== "");
      const { error } = await supabaseRef.current
        .from("profiles")
        .update({
          social_links: filtered,
          linkedin: null,
          facebook: null,
          github: null,
          website: null,
        })
        .eq("id", userId);
      if (error) { toast.error("儲存失敗"); setSavingField(null); return; }
      setLinks(filtered);
      setSavingField(null);
    },
    [userId],
  );

  const addLink = useCallback(() => setLinks((prev) => [...prev, ""]), []);
  const updateLink = useCallback(
    (idx: number, val: string) =>
      setLinks((prev) => prev.map((l, i) => (i === idx ? val : l))),
    [],
  );
  const removeLink = useCallback(
    (idx: number) => {
      setLinks((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        saveLinks(next);
        return next;
      });
    },
    [saveLinks],
  );

  const handleResumeUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;
      setUploadingResume(true);
      e.target.value = "";
      const result = await uploadResumePdf(file, userId);
      if ("error" in result) {
        toast.error(result.error);
        setUploadingResume(false);
        return;
      }
      await saveField("resume", result.path);
      setUploadingResume(false);
    },
    [saveField, userId],
  );

  const handleExImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setExUploadingImage(true);
      const result = await uploadExternalResultImage(file);
      e.target.value = "";
      if ("url" in result) setExForm((f) => ({ ...f, image: result.url }));
      setExUploadingImage(false);
    },
    [],
  );

  const openNewDialog = useCallback(() => {
    setExEditingId(null);
    setExForm({ title: "", description: "", link: "", image: "" });
    setExDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((ext: ExternalResult) => {
    setExEditingId(ext.id);
    setExForm({
      title: ext.title,
      description: ext.description ?? "",
      link: ext.link ?? "",
      image: ext.image ?? "",
    });
    setExDialogOpen(true);
  }, []);

  const submitExternalResult = useCallback(async () => {
    if (!userId || !exForm.title.trim()) return;
    setExSaving(true);
    const sb = supabaseRef.current;
    const payload = {
      title: exForm.title.trim(),
      description: exForm.description.trim() || null,
      link: exForm.link.trim() || null,
      image: exForm.image.trim() || null,
    };
    if (exEditingId) {
      const { data, error } = await sb
        .from("external_results")
        .update(payload)
        .eq("id", exEditingId)
        .select()
        .single();
      if (error) { toast.error("儲存失敗"); setExSaving(false); return; }
      if (data)
        setExternalResults((prev) =>
          prev.map((r) =>
            r.id === exEditingId ? (data as ExternalResult) : r,
          ),
        );
    } else {
      const { data, error } = await sb
        .from("external_results")
        .insert({ user_id: userId, ...payload })
        .select()
        .single();
      if (error) { toast.error("儲存失敗"); setExSaving(false); return; }
      if (data)
        setExternalResults((prev) => [data as ExternalResult, ...prev]);
    }
    setExSaving(false);
    setExDialogOpen(false);
  }, [exEditingId, exForm, userId]);

  const deleteExternalResult = useCallback(async (id: string) => {
    const { error } = await supabaseRef.current.from("external_results").delete().eq("id", id);
    if (error) { toast.error("刪除失敗"); return; }
    setExternalResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const createEventResult = useCallback(async (eventId: string, slug: string) => {
    if (!userId) return;
    setCreatingEventResultId(eventId);
    const { data, error } = await supabaseRef.current
      .from("results")
      .insert({
        title: "新成果",
        date: new Date().toISOString().slice(0, 10),
        header_image: null,
        summary: "",
        content: {},
        status: "draft",
        author_id: userId,
        type: "personal",
        team_id: null,
        event_id: eventId,
      })
      .select()
      .single();
    if (error) {
      toast.error("建立成果失敗");
      setCreatingEventResultId(null);
      return;
    }
    router.push(`/events/${slug}/results/${data.id}/edit`);
  }, [userId, router]);

  return {
    profile,
    savingField,
    displayName,
    setDisplayName,
    bio,
    setBio,
    links,
    addLink,
    updateLink,
    removeLink,
    saveField,
    saveLinks,
    externalResults,
    exDialogOpen,
    setExDialogOpen,
    exSaving,
    exUploadingImage,
    exEditingId,
    exForm,
    setExForm,
    uploadingResume,
    handleResumeUpload,
    handleExImageUpload,
    openNewDialog,
    openEditDialog,
    submitExternalResult,
    deleteExternalResult,
    creatingEventResultId,
    createEventResult,
  };
}
