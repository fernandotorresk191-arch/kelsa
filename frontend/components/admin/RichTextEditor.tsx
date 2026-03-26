'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useState, useCallback, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}

export function RichTextEditor({ value, onChange, disabled, rows = 4 }: RichTextEditorProps) {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[120px] prose prose-sm max-w-none',
        style: 'white-space: pre-wrap;',
      },
    },
  });

  // Sync external value into editor (e.g. when product loads)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const addImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [editor],
  );

  const addImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = prompt('URL изображения:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const toggleSource = useCallback(() => {
    if (!editor) return;
    if (isSourceMode) {
      // Apply source code back to editor
      editor.commands.setContent(sourceCode, { emitUpdate: true });
      onChange(sourceCode);
      setIsSourceMode(false);
    } else {
      setSourceCode(editor.getHTML());
      setIsSourceMode(true);
    }
  }, [editor, isSourceMode, sourceCode, onChange]);

  const setLineHeight = useCallback(
    (lh: string) => {
      if (!editor) return;
      editor.chain().focus().updateAttributes('paragraph', { style: `line-height: ${lh}` }).run();
    },
    [editor],
  );

  const btn = (action: () => boolean | void, label: string, isActive?: boolean, title?: string) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        action();
      }}
      title={title || label}
      className={`px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors ${isActive ? 'bg-gray-200 font-semibold' : ''}`}
    >
      {label}
    </button>
  );

  const minH = `${rows * 24 + 24}px`;

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {btn(() => editor!.chain().focus().toggleBold().run(), 'B', editor?.isActive('bold'), 'Жирный')}
        {btn(() => editor!.chain().focus().toggleItalic().run(), 'I', editor?.isActive('italic'), 'Курсив')}
        {btn(() => editor!.chain().focus().toggleUnderline().run(), 'U', editor?.isActive('underline'), 'Подчёркнутый')}
        {btn(() => editor!.chain().focus().toggleStrike().run(), 'S', editor?.isActive('strike'), 'Зачёркнутый')}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor?.isActive('heading', { level: 2 }))}
        {btn(() => editor!.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor?.isActive('heading', { level: 3 }))}
        {btn(() => editor!.chain().focus().toggleHeading({ level: 4 }).run(), 'H4', editor?.isActive('heading', { level: 4 }))}
        <div className="w-px bg-gray-300 mx-1" />
        {/* Text alignment */}
        {btn(() => editor!.chain().focus().setTextAlign('left').run(), '⬅', editor?.isActive({ textAlign: 'left' }), 'По левому краю')}
        {btn(() => editor!.chain().focus().setTextAlign('center').run(), '⬛', editor?.isActive({ textAlign: 'center' }), 'По центру')}
        {btn(() => editor!.chain().focus().setTextAlign('right').run(), '➡', editor?.isActive({ textAlign: 'right' }), 'По правому краю')}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().toggleBulletList().run(), '• List', editor?.isActive('bulletList'))}
        {btn(() => editor!.chain().focus().toggleOrderedList().run(), '1. List', editor?.isActive('orderedList'))}
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().toggleBlockquote().run(), 'Quote', editor?.isActive('blockquote'))}
        {btn(() => editor!.chain().focus().setHorizontalRule().run(), '—')}
        <div className="w-px bg-gray-300 mx-1" />
        {/* Text color */}
        <label title="Цвет текста" className="relative px-1 py-1 cursor-pointer hover:bg-gray-200 rounded flex items-center">
          <span className="text-sm">🎨</span>
          <input
            type="color"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            onChange={(e) => editor!.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        {btn(() => editor!.chain().focus().unsetColor().run(), '✕🎨', false, 'Сбросить цвет')}
        <div className="w-px bg-gray-300 mx-1" />
        {/* Line height */}
        <select
          title="Межстрочный интервал"
          className="text-sm border border-gray-300 rounded px-1 py-0.5 bg-white"
          onChange={(e) => setLineHeight(e.target.value)}
          defaultValue="1.5"
        >
          <option value="1">1.0</option>
          <option value="1.25">1.25</option>
          <option value="1.5">1.5</option>
          <option value="1.75">1.75</option>
          <option value="2">2.0</option>
          <option value="2.5">2.5</option>
          <option value="3">3.0</option>
        </select>
        <div className="w-px bg-gray-300 mx-1" />
        {/* Image */}
        {btn(addImage, '🖼️', false, 'Вставить изображение (файл)')}
        {btn(addImageByUrl, '🔗🖼️', false, 'Вставить изображение по URL')}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
        <div className="w-px bg-gray-300 mx-1" />
        {btn(() => editor!.chain().focus().undo().run(), '↩')}
        {btn(() => editor!.chain().focus().redo().run(), '↪')}
        <div className="w-px bg-gray-300 mx-1" />
        {/* HTML source mode */}
        <button
          type="button"
          onClick={toggleSource}
          title={isSourceMode ? 'Визуальный режим' : 'HTML код'}
          className={`px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors ${isSourceMode ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
        >
          {'</>'}
        </button>
      </div>

      {/* Editor / Source area */}
      <div
        className="px-4 py-3 bg-white"
        style={{ minHeight: minH }}
      >
        {isSourceMode ? (
          <textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            className="w-full h-full min-h-[200px] font-mono text-sm border-0 outline-none resize-y"
            style={{ minHeight: minH }}
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* Styles for editor content */}
      <style jsx global>{`
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
        }
      `}</style>
    </div>
  );
}
