"use client";

import {
  uploadAnnouncementImage,
} from "@/lib/upload-image";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Undo,
  Youtube as YoutubeIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect } from "react";
import { Button } from "./ui/button";

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

interface TiptapEditorProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  editable?: boolean;
}

function ToolbarButton({
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

export function TiptapEditor({
  content,
  onChange,
  editable = true,
}: TiptapEditorProps) {
  const handleImageDrop = useCallback(
    async (editor: import("@tiptap/core").Editor, files: File[], pos: number) => {
      const results = await Promise.all(
        files.map((file) => uploadAnnouncementImage(file))
      );
      const urls = results
        .filter((r): r is { url: string } => "url" in r)
        .map((r) => r.url);
      results.forEach((r) => {
        if ("error" in r) console.error(r.error);
      });
      if (urls.length === 0) return;
      const content =
        urls.length === 1
          ? { type: "image" as const, attrs: { src: urls[0] } }
          : urls.map((url) => ({ type: "image" as const, attrs: { src: url } }));
      editor.chain().focus().insertContentAt(pos, content).run();
    },
    []
  );

  const handleImagePaste = useCallback(
    async (
      editor: import("@tiptap/core").Editor,
      files: File[]
    ) => {
      for (const file of files) {
        const result = await uploadAnnouncementImage(file);
        if ("error" in result) {
          console.error(result.error);
          continue;
        }
        editor.chain().focus().setImage({ src: result.url }).run();
      }
    },
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "開始撰寫公告內容…",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto",
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: IMAGE_MIME_TYPES,
        onDrop: handleImageDrop,
        onPaste: handleImagePaste,
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "rounded-lg w-full aspect-video",
        },
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[300px] focus:outline-none p-4",
      },
    },
  });

  useEffect(() => {
    if (editor && content && Object.keys(content).length > 0) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-32">
      {editable && (
        <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <div className="pointer-events-auto flex flex-wrap gap-1 p-2 bg-background/80 backdrop-blur-sm border rounded-lg shadow-sm">
          
          <ToolbarButton
            ariaLabel="粗體"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "bg-muted" : ""}
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="斜體"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "bg-muted" : ""}
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="刪除線"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive("strike") ? "bg-muted" : ""}
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <ToolbarButton
            ariaLabel="標題一"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={editor.isActive("heading", { level: 1 }) ? "bg-muted" : ""}
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="標題二"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="標題三"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={editor.isActive("heading", { level: 3 }) ? "bg-muted" : ""}
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="標題四"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 4 }).run()
            }
            className={editor.isActive("heading", { level: 4 }) ? "bg-muted" : ""}
          >
            <Heading4 className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <ToolbarButton
            ariaLabel="項目清單"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "bg-muted" : ""}
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="編號清單"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "bg-muted" : ""}
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <ToolbarButton
            ariaLabel="靠左對齊"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={editor.isActive({ textAlign: "left" }) ? "bg-muted" : ""}
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="置中對齊"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={editor.isActive({ textAlign: "center" }) ? "bg-muted" : ""}
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="靠右對齊"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={editor.isActive({ textAlign: "right" }) ? "bg-muted" : ""}
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <ToolbarButton
            ariaLabel="插入 YouTube 影片"
            onClick={() => {
              const url = window.prompt("請輸入 YouTube 影片網址");
              if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
            }}
          >
            <YoutubeIcon className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-1 self-center" />
          <ToolbarButton
            ariaLabel="復原"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            ariaLabel="重做"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-[2rem] bg-background focus-within:ring-2 focus-within:ring-ring">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
