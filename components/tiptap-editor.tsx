"use client";

import {
  uploadAnnouncementImage,
} from "@/lib/upload-image";
import {
  alignmentCommands,
  headingCommands,
  historyCommands,
  listCommands,
  mediaCommands,
  textFormattingCommands,
  ToolbarButton,
} from "./tiptap-editor-shared";
import { TiptapDesktopBubbleMenu } from "./tiptap-desktop-bubble-menu";
import { TiptapDesktopFloatingMenu } from "./tiptap-desktop-floating-menu";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";

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
          "prose prose-sm sm:prose-base max-w-none min-h-[360px] px-0 py-6 sm:py-8 focus:outline-none [&_img]:pt-4",
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
    <div data-slot="tiptap-editor" className="flex flex-col gap-4">
      {editable && <TiptapDesktopBubbleMenu editor={editor} />}
      {editable && <TiptapDesktopFloatingMenu editor={editor} />}
      {editable && (
        <div className="overflow-x-auto">
          <div className="flex min-w-max flex-wrap gap-1 rounded-lg border bg-background/80 p-2 shadow-sm backdrop-blur-sm">
            {textFormattingCommands.map((command) => {
              const Icon = command.icon;
              return (
                <ToolbarButton
                  key={command.ariaLabel}
                  ariaLabel={command.ariaLabel}
                  onClick={() => command.onClick(editor)}
                  className={command.isActive?.(editor) ? "bg-muted" : ""}
                  disabled={command.isDisabled?.(editor)}
                >
                  <Icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
            <div className="w-px h-6 bg-border mx-1 self-center" />
            {headingCommands.map((command) => {
              const Icon = command.icon;
              return (
                <ToolbarButton
                  key={command.ariaLabel}
                  ariaLabel={command.ariaLabel}
                  onClick={() => command.onClick(editor)}
                  className={command.isActive?.(editor) ? "bg-muted" : ""}
                >
                  <Icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
            <div className="w-px h-6 bg-border mx-1 self-center" />
            {listCommands.map((command) => {
              const Icon = command.icon;
              return (
                <ToolbarButton
                  key={command.ariaLabel}
                  ariaLabel={command.ariaLabel}
                  onClick={() => command.onClick(editor)}
                  className={command.isActive?.(editor) ? "bg-muted" : ""}
                >
                  <Icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
            <div className="w-px h-6 bg-border mx-1 self-center" />
            {alignmentCommands.map((command) => {
              const Icon = command.icon;
              return (
                <ToolbarButton
                  key={command.ariaLabel}
                  ariaLabel={command.ariaLabel}
                  onClick={() => command.onClick(editor)}
                  className={command.isActive?.(editor) ? "bg-muted" : ""}
                >
                  <Icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
            <div className="w-px h-6 bg-border mx-1 self-center" />
            {mediaCommands.map((command) => {
              const Icon = command.icon;
              return (
                <ToolbarButton
                  key={command.ariaLabel}
                  ariaLabel={command.ariaLabel}
                  onClick={() => command.onClick(editor)}
                >
                  <Icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
            <div className="w-px h-6 bg-border mx-1 self-center" />
            {historyCommands.map((command) => {
              const Icon = command.icon;
              return (
                <ToolbarButton
                  key={command.ariaLabel}
                  ariaLabel={command.ariaLabel}
                  onClick={() => command.onClick(editor)}
                  disabled={command.isDisabled?.(editor)}
                >
                  <Icon className="w-4 h-4" />
                </ToolbarButton>
              );
            })}
          </div>
        </div>
      )}
      <div
        data-slot="tiptap-canvas"
        className="rounded-[2rem] bg-background focus-within:ring-2 focus-within:ring-ring"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
