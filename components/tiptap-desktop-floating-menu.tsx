"use client";

import type { Editor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";

import {
  blockCommands,
  getSlashQuery,
  headingCommands,
  ToolbarButton,
  runBlockCommand,
} from "@/components/tiptap-editor-shared";
import { Button } from "@/components/ui/button";

export function TiptapDesktopFloatingMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const slashQuery = getSlashQuery(editor);
  const isSlashMode = slashQuery !== null;
  const filteredSlashCommands = isSlashMode
    ? blockCommands.filter((command) =>
        slashQuery.length === 0 ||
        command.label.toLowerCase().includes(slashQuery) ||
        command.keywords?.some((keyword) => keyword.includes(slashQuery))
      )
    : [];

  return (
    <FloatingMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }: { editor: Editor }) => {
        const { empty, $from } = currentEditor.state.selection;
        const text = $from.parent.textContent;
        return (
          currentEditor.isEditable &&
          empty &&
          $from.parent.type.name === "paragraph" &&
          (text.length === 0 || text.startsWith("/"))
        );
      }}
      className="hidden md:block"
      options={{ placement: "bottom-start" }}
    >
      {isSlashMode ? (
        <div
          data-slot="tiptap-slash-menu"
          className="flex min-w-[15rem] flex-col gap-1 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur-sm"
        >
          {filteredSlashCommands.length > 0 ? (
            filteredSlashCommands.map((command) => {
              const Icon = command.icon;
              return (
                <Button
                  key={command.ariaLabel}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={command.ariaLabel}
                  className="justify-start gap-3 rounded-xl px-3 py-2 text-sm"
                  onClick={() => void runBlockCommand(editor, command)}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{command.label}</span>
                </Button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              沒有符合的插入項目
            </div>
          )}
        </div>
      ) : (
        <div
          data-slot="tiptap-block-menu"
          className="flex items-center gap-1 rounded-full border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
        >
          {headingCommands.slice(0, 2).map((command) => {
            const Icon = command.icon;
            return (
              <ToolbarButton
                key={command.ariaLabel}
                ariaLabel={command.ariaLabel}
                onClick={() => void runBlockCommand(editor, command)}
                className={command.isActive?.(editor) ? "bg-muted" : ""}
              >
                <Icon className="w-4 h-4" />
              </ToolbarButton>
            );
          })}
          <div className="mx-1 h-6 w-px self-center bg-border" />
          {blockCommands.slice(2).map((command) => {
            const Icon = command.icon;
            return (
              <ToolbarButton
                key={command.ariaLabel}
                ariaLabel={command.ariaLabel}
                onClick={() => void runBlockCommand(editor, command)}
                className={command.isActive?.(editor) ? "bg-muted" : ""}
              >
                <Icon className="w-4 h-4" />
              </ToolbarButton>
            );
          })}
        </div>
      )}
    </FloatingMenu>
  );
}
