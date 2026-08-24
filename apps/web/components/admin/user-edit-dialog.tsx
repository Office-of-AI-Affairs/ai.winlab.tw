"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale-provider";

export type ProfileRole = "admin" | "user" | "vendor" | "member";

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: ProfileRole;
  created_at: string;
};

type UserEditDialogProps = {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: UserEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {user && (
          <UserEditForm
            key={user.id}
            user={user}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UserEditForm({
  user,
  onSaved,
  onClose,
}: {
  user: UserRow;
  onSaved: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [role, setRole] = useState<ProfileRole>(user.role);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (profileError) {
      toast.error(profileError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    toast.success(t.editor.status.saved);
    onSaved();
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.admin.users.editUser}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">{t.common.name}</Label>
          <p className="text-sm">
            {user.display_name ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">{t.common.email}</Label>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role-select" className="text-sm font-medium">
            {t.admin.users.field.role}
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as ProfileRole)}>
            <SelectTrigger id="role-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{t.admin.users.roles.user}</SelectItem>
              <SelectItem value="member">{t.admin.users.roles.member}</SelectItem>
              <SelectItem value="vendor">{t.admin.users.roles.vendor}</SelectItem>
              <SelectItem value="admin">{t.admin.users.roles.admin}</SelectItem>
            </SelectContent>
          </Select>
          {role === "vendor" && (
            <p className="text-xs text-muted-foreground">
              {t.admin.users.edit.vendorNote}
            </p>
          )}
          {role === "member" && (
            <p className="text-xs text-muted-foreground">
              {t.admin.users.edit.memberNote}
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin mr-1" />}
          {t.actions.save}
        </Button>
      </DialogFooter>
    </>
  );
}
