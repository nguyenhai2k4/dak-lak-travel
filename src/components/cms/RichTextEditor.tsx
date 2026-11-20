import React, { useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cmsApi } from '../../services/cmsApi';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Viết nội dung chi tiết bài blog tại đây...',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync external value changes (e.g. when switching language tab or loading a post)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập đường dẫn URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const handleInsertImageUrl = () => {
    const url = window.prompt('Dán đường dẫn ảnh (https://... hoặc /uploads/...):', 'https://');
    if (!url || !url.trim()) return;
    const alt = window.prompt('Mô tả ngắn cho ảnh (alt text):', '') || '';
    editor.chain().focus().setImage({ src: url.trim(), alt }).run();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    try {
      const uploadedUrl = await cmsApi.uploadImage(file);
      editor.chain().focus().setImage({ src: uploadedUrl, alt: file.name }).run();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Tải ảnh lên thất bại.');
    } finally {
      setIsUploading(false);
    }
  };

  const btnClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
      active
        ? 'bg-[#132A1E] text-[#F7F3EB]'
        : 'bg-white text-[#1C1917] hover:bg-[#EFE6D5] border border-[#E5DEC9]'
    }`;

  return (
    <div className="rounded-2xl border border-[#D9CEB8] bg-white overflow-hidden shadow-xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-[#F7F3EB] border-b border-[#E5DEC9]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}
          title="Tiêu đề H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnClass(editor.isActive('heading', { level: 3 }))}
          title="Tiêu đề H3"
        >
          H3
        </button>
        <span className="w-px h-5 bg-[#D9CEB8] mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="In đậm"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="In nghiêng"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))}
          title="Gạch chân"
        >
          <span className="underline">U</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive('strike'))}
          title="Gạch ngang"
        >
          <span className="line-through">S</span>
        </button>
        <span className="w-px h-5 bg-[#D9CEB8] mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="Danh sách"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="Danh sách đánh số"
        >
          1. List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnClass(editor.isActive('blockquote'))}
          title="Trích dẫn"
        >
          “Quote”
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnClass(false)}
          title="Đường kẻ phân cách"
        >
          —
        </button>
        <span className="w-px h-5 bg-[#D9CEB8] mx-0.5" />
        <button
          type="button"
          onClick={handleSetLink}
          className={btnClass(editor.isActive('link'))}
          title="Chèn liên kết"
        >
          Link
        </button>
        <button
          type="button"
          onClick={handleInsertImageUrl}
          className={btnClass(false)}
          title="Chèn ảnh từ URL"
        >
          + Ảnh URL
        </button>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={btnClass(false)}
          title="Tải ảnh từ máy tính"
        >
          {isUploading ? 'Đang tải...' : '↑ Tải ảnh'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <span className="w-px h-5 bg-[#D9CEB8] mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-2 py-1.5 rounded-lg text-xs bg-white border border-[#E5DEC9] disabled:opacity-40"
          title="Hoàn tác"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-2 py-1.5 rounded-lg text-xs bg-white border border-[#E5DEC9] disabled:opacity-40"
          title="Làm lại"
        >
          ↻
        </button>
      </div>

      {uploadError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
          {uploadError}
        </div>
      )}

      <div className="tiptap-editor-content blog-rich-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
