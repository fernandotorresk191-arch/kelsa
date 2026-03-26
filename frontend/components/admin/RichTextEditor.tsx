'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}

export function RichTextEditor({ value, onChange, disabled, rows = 4 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[120px] prose prose-sm max-w-none',
      },
    },
  });

  // Sync external value into editor (e.g. when product loads)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const btn = (action: () => boolean, label: string, isActive?: boolean) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        action();
      }}
      title={label}
      className={`px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors ${isActive ? 'bg-gray-200 font-semibold' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {btn(() => editor!.chain().focus().toggleBold().run(), 'Bold', editor?.isActive('bold'))}
        {btn(() => editor!.chain().focus().toggleItalic().run(), 'Italic', editor?.isActive('italic'))}
        {btn(() => editor!.chain().focus().toggleStrike().run(), 'Strike', editor?.isActive('strike'))}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor?.isActive('heading', { level: 2 }))}
        {btn(() => editor!.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor?.isActive('heading', { level: 3 }))}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().toggleBulletList().run(), '• List', editor?.isActive('bulletList'))}
        {btn(() => editor!.chain().focus().toggleOrderedList().run(), '1. List', editor?.isActive('orderedList'))}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().toggleBlockquote().run(), 'Quote', editor?.isActive('blockquote'))}
        {btn(() => editor!.chain().focus().setHorizontalRule().run(), '—')}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().undo().run(), '↩')}
        {btn(() => editor!.chain().focus().redo().run(), '↪')}
      </div>

      {/* Editor area */}
      <div
        className="px-4 py-3 bg-white"
        style={{ minHeight: `${rows * 24 + 24}px` }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
