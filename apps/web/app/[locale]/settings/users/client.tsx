"use client";

import { useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppLink } from "@/components/app-link";
import { UserCreateDialog } from "@/components/user-create-dialog";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { PageShell } from "@/components/page-shell";
import { UsersTable } from "@/components/users-table";
import type { UserRow } from "@/components/users-table";
import { createClient } from "@/lib/supabase/client";
import { buildUsersCsv, parseUsersCsv } from "@/lib/users-csv";
import { useT } from "@/lib/i18n/locale-provider";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function exportUsersCSV(users: UserRow[]) {
  const { csv, filename } = buildUsersCsv(users);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsUsersPageClient({
  initialUsers,
}: {
  initialUsers: UserRow[];
}) {
  const t = useT();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  async function refreshUsers() {
    const { data } = await supabase.rpc("get_all_users");
    setUsers((data as UserRow[]) ?? []);
  }

  async function handleAddTag(userId: string, tag: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newTags = [...(user.tags ?? []), tag];

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tags: newTags } : u))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ tags: newTags })
      .eq("id", userId);

    if (error) {
      toast.error(t.admin.users.toast.addTagFailed);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tags: user.tags } : u))
      );
    }
  }

  async function handleRemoveTag(userId: string, tag: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newTags = (user.tags ?? []).filter((t) => t !== tag);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tags: newTags } : u))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ tags: newTags })
      .eq("id", userId);

    if (error) {
      toast.error(t.admin.users.toast.removeTagFailed);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tags: user.tags } : u))
      );
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        p_user_id: deletingUser.id,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(
          t.admin.users.toast.deleted.replace(
            "{name}",
            deletingUser.display_name || deletingUser.email
          )
        );
        await refreshUsers();
      }
    } catch {
      toast.error(t.admin.users.toast.deleteFailed);
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const text = await file.text();
    const rows = parseUsersCsv(text);
    if (rows.length === 0) {
      toast.error(t.admin.users.toast.csvInvalid);
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const { data: result, error } = await supabase.functions.invoke("import-users", {
      body: { users: rows },
    });

    if (error) {
      toast.error(error.message ?? t.admin.users.toast.importFailed);
    } else {
      setImportResult(result);
      await refreshUsers();
    }
    setIsImporting(false);
  };

  return (
    <PageShell className="block">
      <div className="flex items-center gap-4 mb-8">
        <AppLink
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.admin.settings.title}
        </AppLink>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImport}
      />

      <UsersTable
        users={users}
        isImporting={isImporting}
        importResult={importResult}
        onExport={() => exportUsersCSV(users)}
        onImportClick={() => fileInputRef.current?.click()}
        onCreateUser={() => setShowCreateDialog(true)}
        onEditUser={setEditingUser}
        onDeleteUser={setDeletingUser}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />

      <UserCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={refreshUsers}
      />

      <UserEditDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={() => setEditingUser(null)}
        onSaved={refreshUsers}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.users.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.users.deleteDialog.description.replace(
                "{name}",
                deletingUser?.display_name || deletingUser?.email || ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t.admin.users.deleteDialog.deleting : t.actions.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
