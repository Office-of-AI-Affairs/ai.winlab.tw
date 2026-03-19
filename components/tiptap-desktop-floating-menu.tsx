"use client";

import type { Editor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";

import {
  headingCommands,
  listCommands,
  mediaCommands,
  ToolbarButton,
} from "@/components/tiptap-editor-shared";

export function TiptapDesktopFloatingMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <FloatingMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }: { editor: Editor }) => {
        const { empty, $from } = currentEditor.state.selection;
        return (
          currentEditor.isEditable &&
          empty &&
          $from.parent.type.name === "paragraph" &&
          $from.parent.textContent.length === 0
        );
      }}
      className="hidden md:flex items-center gap-1 rounded-xl border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
      options={{ placement: "left-start" }}
    >
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
    </FloatingMenu>
  );
}
