"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SubButton } from "@/components/ui/sub-button";
import { ArrowLeft, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">開啟 Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog 標題</DialogTitle>
          <DialogDescription>
            這是一個示範 Dialog，可以放任何內容。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Dialog 內容區域。
        </div>
        <DialogFooter showCloseButton>
          <Button>確認</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">刪除項目</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作無法復原，資料將永久刪除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive">刪除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">開啟 Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover 標題</PopoverTitle>
          <PopoverDescription>
            帶有標題與描述的彈出框。
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function SelectDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>預設</Label>
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="選擇一個選項" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option-1">選項 1</SelectItem>
            <SelectItem value="option-2">選項 2</SelectItem>
            <SelectItem value="option-3">選項 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>停用</Label>
        <Select disabled>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="已停用" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function CheckboxDemo() {
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="check-on"
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
        />
        <Label htmlFor="check-on">已勾選</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="check-off" />
        <Label htmlFor="check-off">未勾選</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="check-disabled" disabled />
        <Label htmlFor="check-disabled" className="opacity-50">
          已停用
        </Label>
      </div>
    </div>
  );
}

export function CollapsibleDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">3 個項目</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <ChevronsUpDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="mt-2 rounded-md border px-4 py-2 text-sm">
        永遠顯示的項目
      </div>
      <CollapsibleContent className="mt-2 space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">隱藏項目 1</div>
        <div className="rounded-md border px-4 py-2 text-sm">隱藏項目 2</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubButtonDemo() {
  return (
    <div className="flex gap-4 flex-wrap">
      <SubButton href="/">
        <ArrowLeft className="w-4 h-4" />
        連結樣式
      </SubButton>
      <SubButton onClick={() => {}}>
        <Search className="w-4 h-4" />
        按鈕樣式
      </SubButton>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="flex gap-3 flex-wrap">
      <Button variant="outline" onClick={() => toast.success("操作成功")}>
        成功
      </Button>
      <Button variant="outline" onClick={() => toast.error("操作失敗")}>
        錯誤
      </Button>
      <Button variant="outline" onClick={() => toast.info("提示訊息")}>
        提示
      </Button>
    </div>
  );
}
