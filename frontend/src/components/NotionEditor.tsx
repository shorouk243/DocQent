import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { AnimatePresence, motion } from 'framer-motion';

export type NotionBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'heading_4'
  | 'bullet_list'
  | 'ordered_list'
  | 'toggle'
  | 'code_block'
  | 'quote'
  | 'callout'
  | 'equation';

export interface NotionBlock {
  id: string;
  type: NotionBlockType;
  content: any;
  attrs?: Record<string, unknown>;
}

interface NotionEditorProps {
  initialContent?: any;
  onChange?: (json: any) => void;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  editorRef?: React.MutableRefObject<Editor | null>;
}


const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      title: {
        default: 'Toggle',
        parseHTML: (element) => element.getAttribute('data-title') || 'Toggle',
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-open') !== 'false',
        renderHTML: (attributes) => ({
          'data-open': attributes.open ? 'true' : 'false',
        }),
      },
      size: {
        default: 'md',
        parseHTML: (element) => element.getAttribute('data-size') || 'md',
        renderHTML: (attributes) => ({
          'data-size': attributes.size,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="toggle-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-block' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },
});

const CalloutBlock = Node.create({
  name: 'calloutBlock',
  group: 'block',
  content: 'inline*',
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      icon: {
        default: '💡',
        parseHTML: (element) => element.getAttribute('data-icon') || '💡',
        renderHTML: (attributes) => ({
          'data-icon': attributes.icon,
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout-block' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutBlockView);
  },
});

const EquationBlock = Node.create({
  name: 'equationBlock',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: 'pre[data-type="equation-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes(HTMLAttributes, { 'data-type': 'equation-block' }), ['code', 0]];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EquationBlockView);
  },
});


const ToggleBlockView: React.FC<any> = ({ node, updateAttributes }) => {
  const isOpen = !!node.attrs.open;
  const size = node.attrs.size || 'md';
  const titleClass =
    size === 'lg'
      ? 'text-2xl font-semibold'
      : size === 'sm'
        ? 'text-base font-semibold'
        : 'text-xl font-semibold';

  const applyTitleChange = (value: string) => {
    let nextValue = value;
    let nextSize = size;

    if (value.startsWith('### ')) {
      nextValue = value.replace(/^###\s+/, '');
      nextSize = 'sm';
    } else if (value.startsWith('## ')) {
      nextValue = value.replace(/^##\s+/, '');
      nextSize = 'md';
    } else if (value.startsWith('# ')) {
      nextValue = value.replace(/^#\s+/, '');
      nextSize = 'lg';
    }

    updateAttributes({ title: nextValue, size: nextSize });
  };
  return (
    <NodeViewWrapper className="px-1 py-1">
      <details open={isOpen} className="group">
        <summary
          className="flex items-center gap-2 cursor-pointer list-none"
          onClick={(event) => {
            event.preventDefault();
            updateAttributes({ open: !isOpen });
          }}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center text-gray-600">
            {isOpen ? '▾' : '▸'}
          </span>
          <input
            className={`flex-1 outline-none bg-transparent ${titleClass}`}
            value={node.attrs.title}
            onChange={(event) => applyTitleChange(event.target.value)}
          />
        </summary>
        {isOpen && (
          <div className="mt-2 pl-6">
            <NodeViewContent />
          </div>
        )}
      </details>
    </NodeViewWrapper>
  );
};

const CalloutBlockView: React.FC<any> = ({ node, updateAttributes }) => {
  return (
    <NodeViewWrapper className="flex items-start gap-3 rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2">
      <input
        value={node.attrs.icon}
        onChange={(event) => updateAttributes({ icon: event.target.value })}
        className="w-8 bg-transparent text-lg outline-none"
        aria-label="Callout icon"
      />
      <NodeViewContent className="flex-1 outline-none" />
    </NodeViewWrapper>
  );
};

const EquationBlockView: React.FC<any> = () => {
  return (
    <NodeViewWrapper className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">
      <NodeViewContent className="outline-none" />
    </NodeViewWrapper>
  );
};

type SlashAction = {
  id: string;
  label: string;
  description: string;
  type: NotionBlockType;
  emoji: string;
  shortcut?: string;
};

const SLASH_ACTIONS: SlashAction[] = [
  { id: 'text', label: 'Text', description: 'Plain text block', type: 'paragraph', emoji: 'T', shortcut: '' },
  { id: 'h1', label: 'Heading 1', description: 'Large section heading', type: 'heading_1', emoji: 'H1', shortcut: '#' },
  { id: 'h2', label: 'Heading 2', description: 'Medium section heading', type: 'heading_2', emoji: 'H2', shortcut: '##' },
  { id: 'h3', label: 'Heading 3', description: 'Small section heading', type: 'heading_3', emoji: 'H3', shortcut: '###' },
  { id: 'h4', label: 'Heading 4', description: 'Subsection heading', type: 'heading_4', emoji: 'H4', shortcut: '####' },
  { id: 'bullet', label: 'Bulleted list', description: 'Unordered list', type: 'bullet_list', emoji: '•', shortcut: '-' },
  { id: 'ordered', label: 'Numbered list', description: 'Ordered list', type: 'ordered_list', emoji: '1.', shortcut: '1.' },
  { id: 'toggle', label: 'Toggle list', description: 'Collapsible section', type: 'toggle', emoji: '▸' },
  { id: 'code', label: 'Code block', description: 'Code with monospace', type: 'code_block', emoji: '</>' },
  { id: 'quote', label: 'Quote', description: 'Block quote', type: 'quote', emoji: '❝' },
  { id: 'callout', label: 'Callout', description: 'Highlighted info block', type: 'callout', emoji: '💡' },
  { id: 'equation', label: 'Equation', description: 'Math or formula', type: 'equation', emoji: '∑' },
];

type InlineAction = {
  id: 'link' | 'emoji' | 'text-color';
  label: string;
  description: string;
  emoji: string;
};

const INLINE_ACTIONS: InlineAction[] = [
  { id: 'link', label: 'Link', description: 'Add a hyperlink', emoji: '🔗' },
  { id: 'emoji', label: 'Emoji', description: 'Insert emoji', emoji: '😄' },
  { id: 'text-color', label: 'Text color', description: 'Change text color', emoji: '🎨' },
];

const COLOR_PALETTE = [
  ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb'],
  ['#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
  ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1', '#f0fdfa'],
  ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
  ['#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
  ['#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
  ['#78350f', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
];

export const NotionEditor: React.FC<NotionEditorProps> = ({
  initialContent,
  onChange,
  showHeader = true,
  headerTitle = 'Untitled',
  headerSubtitle = 'Type / to turn blocks into different types.',
  editorRef,
  onOpenColorPalette,
}) => {
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashPosition, setSlashPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slashQuery, setSlashQuery] = useState('');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionTimerRef = useRef<number | null>(null);

  const filteredActions = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return SLASH_ACTIONS;
    return SLASH_ACTIONS.filter((action) => {
      return (
        action.label.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.id.toLowerCase().includes(query)
      );
    });
  }, [slashQuery]);

  const filteredInlineActions = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return INLINE_ACTIONS;
    return INLINE_ACTIONS.filter((action) => {
      return (
        action.label.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.id.toLowerCase().includes(query)
      );
    });
  }, [slashQuery]);

  const combinedActions = useMemo(() => {
    return [
      ...filteredInlineActions.map((action) => ({ kind: 'inline' as const, action })),
      ...filteredActions.map((action) => ({ kind: 'block' as const, action })),
    ];
  }, [filteredInlineActions, filteredActions]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: 'Press "/" for AI commands',
        showOnlyCurrent: true,
        includeChildren: true,
      }),
      ToggleBlock,
      CalloutBlock,
      EquationBlock,
    ],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class:
          'min-h-[500px] px-10 py-8 focus:outline-none text-gray-900 leading-snug prose prose-slate max-w-none prose-p:my-2 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-xl prose-pre:px-4 prose-pre:py-3 prose-code:text-slate-800 prose-a:font-semibold prose-a:underline prose-a:text-slate-800 hover:prose-a:text-slate-900',
      },
      handleKeyDown: (view, event) => {
        if (isSlashOpen) {
          if (event.key === 'Backspace') {
            if (slashQuery.length > 0) {
              event.preventDefault();
              setSlashQuery((prev) => prev.slice(0, -1));
              setActiveIndex(0);
              return true;
            }
            setIsSlashOpen(false);
            return true;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (combinedActions.length === 0) return true;
            setActiveIndex((prev) => Math.min(prev + 1, combinedActions.length - 1));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (combinedActions.length === 0) return true;
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const entry = combinedActions[activeIndex];
            if (entry?.kind === 'inline') {
              applyInlineAction(entry.action.id);
            } else if (entry?.kind === 'block') {
              applyBlockType(entry.action.type);
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setIsSlashOpen(false);
            return true;
          }

          if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            setSlashQuery((prev) => prev + event.key);
            setActiveIndex(0);
            return true;
          }
        }

        return false;
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  const applyBlockType = useCallback(
    (type: NotionBlockType) => {
      if (!editor) return;

      const { from } = editor.state.selection;
      const $from = editor.state.selection.$from;
      const blockStart = $from.start($from.depth);
      const blockEnd = $from.end($from.depth);

      const replaceCurrentBlock = (node: any) => {
        editor
          .chain()
          .focus()
          .insertContentAt({ from: blockStart, to: blockEnd }, node)
          .run();
      };

      const chain = editor.chain().focus();
      if (type === 'paragraph') {
        chain.setParagraph();
      } else if (type === 'heading_1') {
        chain.setHeading({ level: 1 });
      } else if (type === 'heading_2') {
        chain.setHeading({ level: 2 });
      } else if (type === 'heading_3') {
        chain.setHeading({ level: 3 });
      } else if (type === 'heading_4') {
        chain.setHeading({ level: 4 });
      } else if (type === 'bullet_list') {
        chain.toggleBulletList();
      } else if (type === 'ordered_list') {
        chain.toggleOrderedList();
      } else if (type === 'toggle') {
        replaceCurrentBlock({
          type: 'toggleBlock',
          attrs: { title: 'Toggle', open: true, size: 'md' },
          content: [{ type: 'paragraph' }],
        });
      } else if (type === 'code_block') {
        chain.setCodeBlock();
      } else if (type === 'quote') {
        chain.toggleBlockquote();
      } else if (type === 'callout') {
        chain.setNode('calloutBlock');
      } else if (type === 'equation') {
        chain.setNode('equationBlock');
      }

      if (!['toggle'].includes(type)) {
        chain.run();
      }
      setIsSlashOpen(false);
    },
    [editor]
  );

  const applyInlineAction = useCallback(
    (actionId: InlineAction['id']) => {
      if (!editor) return;

      if (actionId === 'link') {
        const { from, to } = editor.state.selection;
        if (from === to) {
          alert('Select text to add a link.');
          return;
        }
        const href = window.prompt('Enter URL');
        if (!href) return;
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
      } else if (actionId === 'emoji') {
        setShowColorPalette(false);
        setShowEmojiPicker(true);
      } else if (actionId === 'text-color') {
        const { from, to } = editor.state.selection;
        if (from === to) {
          alert('Select text to change color.');
          return;
        }
        setShowEmojiPicker(false);
        setShowColorPalette(true);
      }

      if (actionId !== 'text-color' && actionId !== 'emoji') {
        setIsSlashOpen(false);
      }
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (selectionTimerRef.current) {
        window.clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
      }

      if (!hasSelection) {
        setIsSlashOpen(false);
        setShowColorPalette(false);
        setShowEmojiPicker(false);
        return;
      }

      selectionTimerRef.current = window.setTimeout(() => {
        const coords = editor.view.coordsAtPos(to);
        setSlashPosition({ x: coords.left, y: coords.bottom + 8 });
        setIsSlashOpen(true);
        setSlashQuery('');
        setActiveIndex(0);
      }, 150);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (selectionTimerRef.current) {
        window.clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!isSlashOpen) return;
    const query = slashQuery.trim().toLowerCase();
    if (query === 'emoji') {
      setShowEmojiPicker(true);
    }
  }, [slashQuery, isSlashOpen]);

  const menuStyle = useMemo(() => {
    if (!slashPosition) return undefined;
    const width = 420;
    const height = 360;
    const padding = 12;

    let left = slashPosition.x;
    let top = slashPosition.y;

    if (left + width > window.innerWidth - padding) {
      left = window.innerWidth - width - padding;
    }
    if (top + height > window.innerHeight - padding) {
      top = slashPosition.y - height - 12;
    }

    return { left, top, width };
  }, [slashPosition]);

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor ?? null;
    }
  }, [editor, editorRef]);

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full">
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p.is-empty::before {
          color: #9ca3af;
        }
      `}</style>
      {showHeader && (
        <div className="border-b border-gray-200 px-10 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{headerTitle}</h2>
          <p className="text-sm text-gray-500">{headerSubtitle}</p>
        </div>
      )}

      <div ref={containerRef} className="relative">
        <EditorContent editor={editor} />

        <AnimatePresence>
        {isSlashOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 rounded-lg border border-gray-200 bg-white shadow-lg"
            style={menuStyle}
            role="menu"
          >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 flex items-center justify-between">
              <span>Turn into</span>
              {slashQuery && (
                <span className="text-[10px] text-gray-400">Filter: {slashQuery}</span>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1">
              {filteredInlineActions.length === 0 && filteredActions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500">No matching actions.</div>
              ) : (
                <>
                  {filteredInlineActions.length > 0 && (
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400">
                      Inline
                    </div>
                  )}
                  {filteredInlineActions.map((action, index) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => applyInlineAction(action.id)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                        index === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      role="menuitem"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 text-sm font-semibold text-gray-700 flex items-center justify-center">
                          {action.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{action.label}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">{action.description}</div>
                    </button>
                  ))}
                  {showEmojiPicker && (
                    <div className="px-2 py-2">
                      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                        <Picker
                          data={data}
                          onEmojiSelect={(emoji: any) => {
                            const native = emoji?.native || '';
                            if (!native) return;
                            editor.chain().focus().insertContent(native).run();
                            setShowEmojiPicker(false);
                            setIsSlashOpen(false);
                          }}
                          theme="light"
                          previewPosition="none"
                          skinTonePosition="none"
                          navPosition="bottom"
                          perLine={12}
                          emojiSize={22}
                          emojiButtonSize={30}
                          maxFrequentRows={1}
                          style={{ width: '100%', height: 260 }}
                        />
                      </div>
                    </div>
                  )}
                  {showColorPalette && (
                    <div className="px-3 py-3">
                      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-2">
                        <div className="flex flex-col gap-2">
                          {COLOR_PALETTE.map((row, rowIndex) => (
                            <div key={`row-${rowIndex}`} className="flex items-center gap-1">
                              {row.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className="w-5 h-5 rounded-sm border border-gray-200"
                                  style={{ backgroundColor: color }}
                                  onClick={() => {
                                    editor.chain().focus().setColor(color).run();
                                    setShowColorPalette(false);
                                    setIsSlashOpen(false);
                                  }}
                                  aria-label={`Text color ${color}`}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredActions.length > 0 && (
                    <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400">
                      Basic blocks
                    </div>
                  )}
                  {filteredActions.map((action, index) => {
                    const combinedIndex = filteredInlineActions.length + index;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => applyBlockType(action.type)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                          combinedIndex === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                        role="menuitem"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-sm font-semibold text-gray-700 flex items-center justify-center">
                            {action.emoji}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{action.label}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">{action.shortcut || ''}</div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsSlashOpen(false)}
              className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100 flex items-center justify-between"
            >
              <span>Close menu</span>
              <span className="text-xs text-gray-400">esc</span>
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};
