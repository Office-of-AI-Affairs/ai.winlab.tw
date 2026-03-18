"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/supabase/types";
import { Check, Loader2, Pencil, Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  selectedTagIds: Set<string>;
  onToggle: (tagId: string) => void;
  onClear: () => void;
  isAdmin: boolean;
};

type TagWithChildren = Tag & { children: Tag[] };

export function ResultTagSidebar({ selectedTagIds, onToggle, onClear, isAdmin }: Props) {
  const supabase = createClient();
  const [tags, setTags] = useState<TagWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add/edit state
  const [addingParent, setAddingParent] = useState(false);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const allTags = (data as Tag[]) || [];
    const parents = allTags.filter((t) => t.parent_id === null);
    const grouped: TagWithChildren[] = parents.map((p) => ({
      ...p,
      children: allTags.filter((c) => c.parent_id === p.id),
    }));
    setTags(grouped);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      const { data } = await supabase
        .from("tags")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      const allTags = (data as Tag[]) || [];
      const parents = allTags.filter((t) => t.parent_id === null);
      const grouped: TagWithChildren[] = parents.map((p) => ({
        ...p,
        children: allTags.filter((c) => c.parent_id === p.id),
      }));
      setTags(grouped);
      setIsLoading(false);
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleAddParent = async () => {
    if (!inputValue.trim()) return;
    setSaving(true);
    await supabase.from("tags").insert({ name: inputValue.trim(), parent_id: null, sort_order: tags.length });
    setInputValue("");
    setAddingParent(false);
    await fetchTags();
    setSaving(false);
  };

  const handleAddChild = async (parentId: string) => {
    if (!inputValue.trim()) return;
    setSaving(true);
    const parent = tags.find((p) => p.id === parentId);
    const childCount = parent?.children.length ?? 0;
    await supabase.from("tags").insert({ name: inputValue.trim(), parent_id: parentId, sort_order: childCount });
    setInputValue("");
    setAddingChildOf(null);
    await fetchTags();
    setSaving(false);
  };

  const handleRename = async (tagId: string) => {
    if (!inputValue.trim()) return;
    setSaving(true);
    await supabase.from("tags").update({ name: inputValue.trim() }).eq("id", tagId);
    setInputValue("");
    setEditingId(null);
    await fetchTags();
    setSaving(false);
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm("確定要刪除此標籤？（包含所有子標籤）")) return;
    await supabase.from("tags").delete().eq("id", tagId);
    if (selectedTagIds.has(tagId)) onToggle(tagId);
    await fetchTags();
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setInputValue(tag.name);
    setAddingParent(false);
    setAddingChildOf(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingParent(false);
    setAddingChildOf(null);
    setInputValue("");
  };

  // Determine if a parent is "active" (itself or any child is selected)
  const isParentActive = (parent: TagWithChildren) => {
    if (selectedTagIds.has(parent.id)) return true;
    return parent.children.some((c) => selectedTagIds.has(c.id));
  };

  return (
    <aside className="w-full flex flex-col gap-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <TagIcon className="w-3.5 h-3.5" />
          標籤篩選
        </span>
        {isAdmin && !addingParent && (
          <button
            type="button"
            onClick={() => { setAddingParent(true); setInputValue(""); setEditingId(null); setAddingChildOf(null); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="新增大標"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Add parent input */}
      {addingParent && (
        <InlineInput
          value={inputValue}
          onChange={setInputValue}
          onConfirm={handleAddParent}
          onCancel={cancelEdit}
          saving={saving}
          placeholder="大標名稱…"
        />
      )}

      {/* 全部 */}
      <button
        type="button"
        onClick={onClear}
        className={`w-full text-left px-2 py-1 rounded-md text-sm transition-colors ${
          selectedTagIds.size === 0
            ? "bg-foreground text-background font-medium"
            : "hover:bg-muted text-foreground"
        }`}
      >
        全部
      </button>

      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto mt-4" />
      ) : (
        <div className="flex flex-col gap-0.5 mt-1">
          {tags.map((parent) => (
            <div key={parent.id} className="flex flex-col gap-0.5">
              {/* Parent tag row */}
              <div className="group flex items-center gap-1">
                {editingId === parent.id ? (
                  <InlineInput
                    value={inputValue}
                    onChange={setInputValue}
                    onConfirm={() => handleRename(parent.id)}
                    onCancel={cancelEdit}
                    saving={saving}
                    placeholder="大標名稱…"
                    className="flex-1"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggle(parent.id)}
                      className={`flex-1 text-left px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                        isParentActive(parent)
                          ? "bg-foreground text-background"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      {parent.name}
                    </button>
                    {isAdmin && (
                      <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setAddingChildOf(parent.id); setInputValue(""); setEditingId(null); setAddingParent(false); }}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                          title="新增小標"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(parent)}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                          title="編輯"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(parent.id)}
                          className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                          title="刪除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Children */}
              <div className="flex flex-col gap-0.5 ml-3">
                {parent.children.map((child) => (
                  <div key={child.id} className="group flex items-center gap-1">
                    {editingId === child.id ? (
                      <InlineInput
                        value={inputValue}
                        onChange={setInputValue}
                        onConfirm={() => handleRename(child.id)}
                        onCancel={cancelEdit}
                        saving={saving}
                        placeholder="小標名稱…"
                        className="flex-1"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggle(child.id)}
                          className={`flex-1 text-left px-2 py-1 rounded-md text-sm transition-colors ${
                            selectedTagIds.has(child.id)
                              ? "bg-foreground text-background font-medium"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {child.name}
                        </button>
                        {isAdmin && (
                          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(child)}
                              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                              title="編輯"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(child.id)}
                              className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                              title="刪除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* Add child input */}
                {addingChildOf === parent.id && (
                  <InlineInput
                    value={inputValue}
                    onChange={setInputValue}
                    onConfirm={() => handleAddChild(parent.id)}
                    onCancel={cancelEdit}
                    saving={saving}
                    placeholder="小標名稱…"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function InlineInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  saving,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="h-6 text-xs px-2 py-0"
        disabled={saving}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0"
        onClick={onConfirm}
        disabled={saving}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0"
        onClick={onCancel}
        disabled={saving}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
