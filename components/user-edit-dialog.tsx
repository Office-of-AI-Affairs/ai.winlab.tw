"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EventVendorPicker } from "@/components/event-vendor-picker";
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

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
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
  const [role, setRole] = useState(user.role);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [vendorEventsLoaded, setVendorEventsLoaded] = useState(user.role !== "vendor");

  // Fetch existing vendor event assignments
  useEffect(() => {
    if (user.role !== "vendor") return;

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_vendors")
        .select("event_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("Failed to load vendor events:", error);
        toast.error("無法載入廠商活動資料");
        return;
      }
      setEventIds((data ?? []).map((r: { event_id: string }) => r.event_id));
      setVendorEventsLoaded(true);
    }

    void load();
  }, [user.id, user.role]);

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

    if (role === "vendor" && !vendorEventsLoaded && user.role === "vendor") {
      toast.error("活動資料尚未載入，無法儲存");
      setSaving(false);
      return;
    }

    if (role === "vendor") {
      // Sync event_vendors: delete all then re-insert
      const { error: deleteError } = await supabase
        .from("event_vendors")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        toast.error(deleteError.message);
        setSaving(false);
        return;
      }

      if (eventIds.length > 0) {
        const { error: insertError } = await supabase
          .from("event_vendors")
          .insert(eventIds.map((event_id) => ({ user_id: user.id, event_id })));

        if (insertError) {
          toast.error(insertError.message);
          setSaving(false);
          return;
        }
      }
    } else {
      // Role changed away from vendor — clean up event_vendors
      const { error: deleteError } = await supabase
        .from("event_vendors")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        toast.error(deleteError.message);
        setSaving(false);
        return;
      }
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
        {/* Display name (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">姓名</Label>
          <p className="text-sm">
            {user.display_name ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">電子信箱</Label>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {/* Role selector */}
        <div className="space-y-1.5">
          <Label htmlFor="role-select" className="text-sm font-medium">
            角色
          </Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="role-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">一般用戶</SelectItem>
              <SelectItem value="vendor">廠商</SelectItem>
              <SelectItem value="admin">管理員</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Event assignment for vendor role */}
        {role === "vendor" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">指定活動</Label>
            <EventVendorPicker
              selectedEventIds={eventIds}
              onChange={setEventIds}
            />
          </div>
        )}
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
