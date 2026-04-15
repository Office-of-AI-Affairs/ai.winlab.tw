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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

type UserCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function UserCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: UserCreateDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("user");
  }

  async function handleCreate() {
    if (!email.trim()) {
      toast.error("請填寫電子信箱");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_create_user", {
        p_email: email.trim(),
        p_name: name.trim() || null,
        p_role: role,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("使用者已建立，需透過「忘記密碼」設定密碼");
      reset();
      onCreated();
      onOpenChange(false);
    } catch {
      toast.error("建立失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增使用者</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">姓名</Label>
            <Input
              id="create-name"
              placeholder="顯示名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-email">
              電子信箱 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-role">角色</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="create-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">一般用戶</SelectItem>
                <SelectItem value="vendor">廠商</SelectItem>
                <SelectItem value="admin">管理員</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            建立
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
