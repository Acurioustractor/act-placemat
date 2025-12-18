'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MediaPicker } from './MediaPicker';
import type { ContentBlock, MediaItem } from '../../types/yearInReview';

interface BlockEditorProps {
  initialContent?: ContentBlock[];
  content?: ContentBlock[];
  onChange?: (blocks: ContentBlock[]) => void;
  placeholder?: string;
}

/**
 * Rich text block editor using Tiptap
 */
export function BlockEditor({
  initialContent = [],
  content,
  onChange,
  placeholder = 'Start writing your story...'
}: BlockEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const sourceContent = content ?? initialContent;
  const lastAppliedSignatureRef = useRef<string>('');
  const lastEmittedSignatureRef = useRef<string>('');

  const contentSignature = useMemo(() => {
    try {
      return JSON.stringify(sourceContent ?? []);
    } catch {
      return String(Date.now());
    }
  }, [sourceContent]);

  // Convert content blocks to Tiptap HTML
  const getHtmlFromBlocks = useCallback((blocks: ContentBlock[]) => {
    if (!blocks || blocks.length === 0) return '';

    return blocks.filter(Boolean).map((block: any) => {
      const data = block?.data ?? {};
      switch (block.type) {
        case 'paragraph':
          return `<p>${data.text || ''}</p>`;
        case 'heading':
          const level = data.level || 2;
          return `<h${level}>${data.text || ''}</h${level}>`;
        case 'image':
          return `<img src="${data.mediaUrl || ''}" alt="${data.altText || ''}" />`;
        case 'video':
          if (data.platform === 'youtube') {
            return `<div data-youtube-video><iframe src="${data.videoUrl || ''}"></iframe></div>`;
          }
          return `<p>[Video: ${data.videoUrl || ''}]</p>`;
        case 'quote':
          return `<blockquote><p>${data.quoteText || ''}</p>${data.quoteAuthor ? `<p><em>— ${data.quoteAuthor}</em></p>` : ''}</blockquote>`;
        case 'divider':
          return '<hr />';
        default:
          return '';
      }
    }).join('');
  }, []);

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full'
        }
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'rounded-lg'
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-teal-400 underline'
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: getHtmlFromBlocks(sourceContent),
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-slate max-w-none min-h-[300px] focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const blocks = convertToBlocks(editor.getJSON());
        const supportedTypes = new Set(['paragraph', 'heading', 'image', 'video', 'quote', 'divider']);
        const preservedBlocks =
          content && Array.isArray(content)
            ? content.filter((b: any) => {
                if (!b) return false;
                if (!supportedTypes.has(b.type)) return true;
                if (b.type !== 'video') return false;
                const platform = b.data?.platform || b.platform;
                return platform && platform !== 'youtube';
              })
            : [];

        const mergedBlocks =
          preservedBlocks.length > 0
            ? [
                ...blocks,
                ...preservedBlocks.filter((p: any) => !blocks.some((b: any) => b.id === p.id)),
              ]
            : blocks;
        try {
          lastEmittedSignatureRef.current = JSON.stringify(mergedBlocks);
        } catch {
          lastEmittedSignatureRef.current = String(Date.now());
        }
        onChange(mergedBlocks);
      }
    }
  });

  // Apply externally-provided content (AI generation, quick-add, etc) without breaking typing.
  useEffect(() => {
    if (!editor) return;
    if (!content) return; // Only sync when using the controlled `content` prop.

    // Ignore updates that simply echo the editor's last emission.
    if (contentSignature === lastEmittedSignatureRef.current) return;
    if (contentSignature === lastAppliedSignatureRef.current) return;

    editor.commands.setContent(getHtmlFromBlocks(sourceContent), { emitUpdate: false });
    lastAppliedSignatureRef.current = contentSignature;
  }, [content, contentSignature, editor, getHtmlFromBlocks, sourceContent]);

  // Convert Tiptap JSON to our ContentBlock format
  const convertToBlocks = (json: any): ContentBlock[] => {
    const blocks: ContentBlock[] = [];

    const processNode = (node: any) => {
      if (!node) return;

      switch (node.type) {
        case 'paragraph':
          if (node.content) {
            const text = node.content.map((c: any) => c.text || '').join('');
            if (text.trim()) {
              blocks.push({
                id: `p-${blocks.length}`,
                type: 'paragraph',
                data: { text }
              });
            }
          }
          break;

        case 'heading':
          if (node.content) {
            const text = node.content.map((c: any) => c.text || '').join('');
            blocks.push({
              id: `h-${blocks.length}`,
              type: 'heading',
              data: {
                text,
                level: node.attrs?.level || 2
              }
            });
          }
          break;

        case 'image':
          blocks.push({
            id: `img-${blocks.length}`,
            type: 'image',
            data: {
              mediaUrl: node.attrs?.src,
              altText: node.attrs?.alt
            }
          });
          break;

        case 'youtube':
          blocks.push({
            id: `vid-${blocks.length}`,
            type: 'video',
            data: {
              videoUrl: node.attrs?.src,
              platform: 'youtube'
            }
          });
          break;

        case 'blockquote':
          if (node.content) {
            const lines = node.content
              .filter((c: any) => c.type === 'paragraph')
              .map((p: any) => p.content?.map((t: any) => t.text || '').join('') || '');

            blocks.push({
              id: `q-${blocks.length}`,
              type: 'quote',
              data: {
                quoteText: lines[0] || '',
                quoteAuthor: lines[1]?.replace(/^— /, '') || ''
              }
            });
          }
          break;

        case 'horizontalRule':
          blocks.push({
            id: `hr-${blocks.length}`,
            type: 'divider',
            data: {}
          });
          break;

        case 'doc':
          node.content?.forEach(processNode);
          break;
      }
    };

    processNode(json);
    return blocks;
  };

  // Insert image from media picker
  const handleMediaSelect = (media: MediaItem) => {
    if (editor) {
      editor.chain().focus().setImage({
        src: media.fileUrl,
        alt: media.altText || media.title || ''
      }).run();
    }
    setShowMediaPicker(false);
  };

  // Insert YouTube video
  const handleVideoInsert = () => {
    if (editor && videoUrl) {
      // Extract YouTube ID
      const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) {
        editor.chain().focus().setYoutubeVideo({
          src: `https://www.youtube.com/embed/${ytMatch[1]}`
        }).run();
      }
    }
    setVideoUrl('');
    setShowVideoInput(false);
  };

  // Add link
  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="animate-pulse bg-slate-800 rounded-xl h-64" />
    );
  }

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-700 bg-slate-800/50">
        {/* Text formatting */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <ListIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <OrderedListIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <QuoteIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Media */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => setShowMediaPicker(true)}
            title="Insert Image"
          >
            <ImageIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setShowVideoInput(true)}
            title="Insert Video"
          >
            <VideoIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <DividerIcon />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <UndoIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <RedoIcon />
          </ToolbarButton>
        </ToolbarGroup>
      </div>

      {/* Bubble menu for selected text */}
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-1 p-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              small
            >
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              small
            >
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive('link')}
              small
            >
              <LinkIcon />
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      {/* Editor content */}
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>

      {/* Video URL input modal */}
      {showVideoInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowVideoInput(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Insert YouTube Video</h3>
            <input
              type="text"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowVideoInput(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVideoInsert}
                disabled={!videoUrl}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media picker */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        mediaType="photo"
        title="Insert Image"
      />
    </div>
  );
}

// Toolbar components
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-600 mx-1" />;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  small?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, small, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        ${small ? 'p-1.5' : 'p-2'} rounded transition-colors
        ${isActive ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}

// Icons
function BoldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function DividerIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
    </svg>
  );
}

export default BlockEditor;
