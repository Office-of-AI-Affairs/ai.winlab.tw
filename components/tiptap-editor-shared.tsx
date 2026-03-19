"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Undo,
  Youtube as YoutubeIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadAnnouncementImage } from "@/lib/upload-image";

export function ToolbarButton({
  ariaLabel,
  className,
  ...props
}: ComponentProps<typeof Button> & { ariaLabel: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={ariaLabel}
      className={className}
      {...props}
    />
  );
}

type EditorCommand = {
  ariaLabel: string;
  label: string;
  icon: typeof Bold;
  keywords?: string[];
  isActive?: (editor: Editor) => boolean;
  onClick: (editor: Editor) => void | Promise<void>;
  isDisabled?: (editor: Editor) => boolean;
};

export const textFormattingCommands: EditorCommand[] = [
  {
    ariaLabel: "粗體",
    label: "粗體",
    icon: Bold,
    isActive: (editor) => editor.isActive("bold"),
    onClick: (editor) => {
      editor.chain().focus().toggleBold().run();
    },
  },
  {
    ariaLabel: "斜體",
    label: "斜體",
    icon: Italic,
    isActive: (editor) => editor.isActive("italic"),
    onClick: (editor) => {
      editor.chain().focus().toggleItalic().run();
    },
  },
  {
    ariaLabel: "刪除線",
    label: "刪除線",
    icon: Strikethrough,
    isActive: (editor) => editor.isActive("strike"),
    onClick: (editor) => {
      editor.chain().focus().toggleStrike().run();
    },
  },
];

export const headingCommands: EditorCommand[] = [
  {
    ariaLabel: "標題一",
    label: "標題 1",
    icon: Heading1,
    keywords: ["h1", "heading", "title"],
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    onClick: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    ariaLabel: "標題二",
    label: "標題 2",
    icon: Heading2,
    keywords: ["h2", "heading", "subtitle"],
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    onClick: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    ariaLabel: "標題三",
    label: "標題 3",
    icon: Heading3,
    keywords: ["h3", "heading"],
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    onClick: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    ariaLabel: "標題四",
    label: "標題 4",
    icon: Heading4,
    keywords: ["h4", "heading"],
    isActive: (editor) => editor.isActive("heading", { level: 4 }),
    onClick: (editor) => {
      editor.chain().focus().toggleHeading({ level: 4 }).run();
    },
  },
];

export const listCommands: EditorCommand[] = [
  {
    ariaLabel: "項目清單",
    label: "項目清單",
    icon: List,
    keywords: ["list", "bullet"],
    isActive: (editor) => editor.isActive("bulletList"),
    onClick: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    ariaLabel: "編號清單",
    label: "編號清單",
    icon: ListOrdered,
    keywords: ["list", "ordered", "number"],
    isActive: (editor) => editor.isActive("orderedList"),
    onClick: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
];

export const alignmentCommands: EditorCommand[] = [
  {
    ariaLabel: "靠左對齊",
    label: "靠左對齊",
    icon: AlignLeft,
    isActive: (editor) => editor.isActive({ textAlign: "left" }),
    onClick: (editor) => {
      editor.chain().focus().setTextAlign("left").run();
    },
  },
  {
    ariaLabel: "置中對齊",
    label: "置中對齊",
    icon: AlignCenter,
    isActive: (editor) => editor.isActive({ textAlign: "center" }),
    onClick: (editor) => {
      editor.chain().focus().setTextAlign("center").run();
    },
  },
  {
    ariaLabel: "靠右對齊",
    label: "靠右對齊",
    icon: AlignRight,
    isActive: (editor) => editor.isActive({ textAlign: "right" }),
    onClick: (editor) => {
      editor.chain().focus().setTextAlign("right").run();
    },
  },
];

export const historyCommands: EditorCommand[] = [
  {
    ariaLabel: "復原",
    label: "復原",
    icon: Undo,
    onClick: (editor) => {
      editor.chain().focus().undo().run();
    },
    isDisabled: (editor) => !editor.can().undo(),
  },
  {
    ariaLabel: "重做",
    label: "重做",
    icon: Redo,
    onClick: (editor) => {
      editor.chain().focus().redo().run();
    },
    isDisabled: (editor) => !editor.can().redo(),
  },
];

async function pickImageFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/gif,image/webp";

  const file = await new Promise<File | null>((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });

  return file;
}

export const mediaCommands: EditorCommand[] = [
  {
    ariaLabel: "插入圖片",
    label: "插入圖片",
    icon: ImagePlus,
    keywords: ["image", "photo", "picture", "media"],
    onClick: async (editor) => {
      const file = await pickImageFile();
      if (!file) return;

      const result = await uploadAnnouncementImage(file);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      editor.chain().focus().setImage({ src: result.url }).run();
    },
  },
  {
    ariaLabel: "插入 YouTube 影片",
    label: "插入 YouTube",
    icon: YoutubeIcon,
    keywords: ["youtube", "video", "media"],
    onClick: (editor) => {
      const url = window.prompt("請輸入 YouTube 影片網址");
      if (url) {
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      }
    },
  },
];

export const blockCommands: EditorCommand[] = [
  ...headingCommands.slice(0, 2),
  ...listCommands,
  ...mediaCommands,
];

export function getSlashQuery(editor: Editor) {
  const { empty, $from } = editor.state.selection;
  if (!empty || $from.parent.type.name !== "paragraph") return null;

  const text = $from.parent.textContent;
  if (!text.startsWith("/")) return null;

  return text.slice(1).trim().toLowerCase();
}

export async function runBlockCommand(editor: Editor, command: EditorCommand) {
  const slashQuery = getSlashQuery(editor);

  if (slashQuery !== null) {
    const { $from } = editor.state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({
        from: $from.start(),
        to: $from.end(),
      })
      .run();
  }

  await command.onClick(editor);
}
