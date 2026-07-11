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
import { useT } from "@/lib/i18n/locale-provider";

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
  const t = useT();
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
      toast.error(t.admin.users.create.toast.emailRequired);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_create_user", {
        p_email: email.trim(),
        p_name: name.trim() || undefined,
        p_role: role,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(t.admin.users.create.toast.success);
      reset();
      onCreated();
      onOpenChange(false);
    } catch {
      toast.error(t.common.createFailed);
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
          <DialogTitle>{t.admin.users.createUser}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">{t.common.name}</Label>
            <Input
              id="create-name"
              placeholder={t.admin.users.create.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-email">
              {t.common.email} <span className="text-destructive">*</span>
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
            <Label htmlFor="create-role">{t.admin.users.field.role}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="create-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t.admin.users.roles.user}</SelectItem>
                <SelectItem value="vendor">{t.admin.users.roles.vendor}</SelectItem>
                <SelectItem value="admin">{t.admin.users.roles.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.actions.cancel}
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            {t.actions.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
