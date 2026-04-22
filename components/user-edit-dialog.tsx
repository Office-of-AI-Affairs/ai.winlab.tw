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

export type ProfileRole = "admin" | "user" | "vendor";

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
    toast.success("已儲存");
    onSaved();
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>編輯使用者</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">姓名</Label>
          <p className="text-sm">
            {user.display_name ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">電子信箱</Label>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role-select" className="text-sm font-medium">
            角色
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as ProfileRole)}>
            <SelectTrigger id="role-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">一般用戶</SelectItem>
              <SelectItem value="vendor">廠商</SelectItem>
              <SelectItem value="admin">管理員</SelectItem>
            </SelectContent>
          </Select>
          {role === "vendor" && (
            <p className="text-xs text-muted-foreground">
              vendor 權限由 <strong>徵才編輯頁</strong> 的「擁有者」清單決定（不再綁活動）。
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin mr-1" />}
          儲存
        </Button>
      </DialogFooter>
    </>
  );
}
