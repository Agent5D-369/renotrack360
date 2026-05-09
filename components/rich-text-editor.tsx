"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={[
        "flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs font-semibold transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  name,
  defaultValue,
  placeholder
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? "Start typing…" })
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] px-3 py-2 text-sm outline-none prose prose-sm max-w-none [&>*:first-child]:mt-0"
      }
    },
    onUpdate({ editor }: { editor: import("@tiptap/core").Editor }) {
      if (hiddenRef.current) {
        hiddenRef.current.value = editor.getHTML();
      }
    },
    immediatelyRender: false
  });

  // Sync initial value to hidden input after mount
  useEffect(() => {
    if (hiddenRef.current && editor) {
      hiddenRef.current.value = editor.getHTML();
    }
  }, [editor]);

  if (!editor) return null;

  const cmd = () => editor.chain().focus();

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white focus-within:ring-2 focus-within:ring-primary">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton onClick={() => cmd().toggleBold().run()} active={editor.isActive("bold")} title="Bold">B</ToolbarButton>
        <ToolbarButton onClick={() => cmd().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><em>I</em></ToolbarButton>
        <ToolbarButton onClick={() => cmd().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><u>U</u></ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => cmd().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">H2</ToolbarButton>
        <ToolbarButton onClick={() => cmd().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">H3</ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => cmd().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">• List</ToolbarButton>
        <ToolbarButton onClick={() => cmd().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">1. List</ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => cmd().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">"</ToolbarButton>
        <ToolbarButton onClick={() => cmd().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">{"{}"}</ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => cmd().unsetAllMarks().clearNodes().run()} title="Clear formatting">Clear</ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Hidden input carries the HTML value on form submit */}
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
