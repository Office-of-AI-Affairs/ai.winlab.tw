"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import {
  alignmentCommands,
  headingCommands,
  listCommands,
  textFormattingCommands,
  ToolbarButton,
} from "@/components/tiptap-editor-shared";

export function TiptapDesktopBubbleMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }: { editor: Editor }) =>
        currentEditor.isEditable &&
        !currentEditor.state.selection.empty
      }
      className="hidden md:flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
      options={{ placement: "top" }}
    >
      {textFormattingCommands.map((command) => {
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
      <div className="mx-1 h-6 w-px self-center bg-border" />
      {headingCommands.slice(0, 2).map((command) => {
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
      <div className="mx-1 h-6 w-px self-center bg-border" />
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
      <div className="mx-1 h-6 w-px self-center bg-border" />
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
    </BubbleMenu>
  );
}
