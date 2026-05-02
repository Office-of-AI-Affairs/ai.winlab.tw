"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";

import {
  blockCommands,
  headingCommands,
  listCommands,
  runBlockCommand,
  textFormattingCommands,
  ToolbarButton,
} from "@/components/tiptap-editor-shared";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export function TiptapMobileToolbar({ editor }: { editor: Editor | null }) {
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  if (!editor) return null;

  const compactCommands = [
    textFormattingCommands[0],
    textFormattingCommands[1],
    headingCommands[0],
    listCommands[0],
  ];

  return (
    <div
      data-slot="tiptap-mobile-toolbar"
      className={cn(
        "md:hidden fixed bottom-4 left-4 z-30 pointer-events-auto border border-border bg-background/95 shadow-lg backdrop-blur-sm",
        showInsertMenu
          ? "flex flex-col gap-2 rounded-2xl p-2"
          : "inline-flex h-10 items-center gap-1 rounded-full px-1",
      )}
    >
      {showInsertMenu && (
        <div className="flex flex-wrap gap-1 border-b border-border pb-2">
          {blockCommands.map((command) => {
            const Icon = command.icon;
            return (
              <ToolbarButton
                key={command.ariaLabel}
                ariaLabel={command.ariaLabel}
                onClick={() => {
                  void runBlockCommand(editor, command);
                  setShowInsertMenu(false);
                }}
                className={command.isActive?.(editor) ? "bg-muted" : ""}
              >
                <Icon className="w-4 h-4" />
              </ToolbarButton>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        <ToolbarButton
          ariaLabel="開啟插入選單"
          data-slot="tiptap-mobile-insert-trigger"
          onClick={() => setShowInsertMenu((value) => !value)}
          className={showInsertMenu ? "bg-muted" : ""}
        >
          <Plus className="w-4 h-4" />
        </ToolbarButton>
        {compactCommands.map((command) => {
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
      </div>
    </div>
  );
}
