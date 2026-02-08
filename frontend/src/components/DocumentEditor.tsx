import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Document } from '../api/documents';
import { WebSocketOperation } from '../services/websocket';
import { AICommandMenu } from './AICommandMenu';
import { AIResponseBlock } from './AIResponseBlock';
import { aiApi } from '../api/ai';
import { NotionEditor } from './NotionEditor';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

export interface EditorCommands {
  bold: () => void;
  italic: () => void;
  underline: () => void;
  heading: (level: 1 | 2 | 3) => void;
}

interface DocumentEditorProps {
  document: Document;
  userId: number;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSendOperation: (operation: WebSocketOperation) => void;
  onOperationReceived?: (operation: WebSocketOperation) => void;
  operationHandlerRef?: React.MutableRefObject<((op: WebSocketOperation) => void) | null>;
  commandsRef?: React.MutableRefObject<EditorCommands | null>;
}

const buildFallbackDoc = (text: string) => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : [],
    },
  ],
});

const parseDocumentContent = (raw: string) => {
  if (!raw) return buildFallbackDoc('');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === 'doc') {
      return parsed;
    }
  } catch (error) {
    // Ignore parse error and fallback to plain text.
  }
  return buildFallbackDoc(raw);
};

/**
 * Document Editor Component
 *
 * - Editable title
 * - Notion-like block editor (TipTap)
 * - AI assistant actions
 *
 * Note: WebSocket collaboration for block-level JSON is not implemented here.
 */
export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  userId,
  onTitleChange,
  onContentChange,
  onSendOperation,
  operationHandlerRef,
}) => {
  void userId;
  const [title, setTitle] = useState(document.title);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuPosition, setCommandMenuPosition] = useState<{ x: number; y: number } | undefined>();
  const [selectedText, setSelectedText] = useState('');
  const aiStreamRangeRef = useRef<{ start: number; end: number } | null>(null);
  const aiStreamLengthRef = useRef(0);
  const aiStreamStartRef = useRef<number | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const [showOutline] = useState(true);
  const [outlineItems, setOutlineItems] = useState<
    { id: string; level: number; text: string; pos: number }[]
  >([]);

  const editorRef = useRef<Editor | null>(null);
  const prevDocumentIdRef = useRef<number | null>(document.id);

  const initialContent = useMemo(() => parseDocumentContent(document.content), [document.content]);

  useEffect(() => {
    if (prevDocumentIdRef.current !== document.id) {
      setTitle(document.title);
      prevDocumentIdRef.current = document.id;
      setAiResponse(null);
      setStreamingResponse('');
      setShowCommandMenu(false);
    }
  }, [document.id, document.title]);

  useEffect(() => {
    if (!operationHandlerRef) return;
    operationHandlerRef.current = (operation) => {
      console.log('📥 DocumentEditor: Received operation:', {
        op: operation.op,
        user_id: operation.user_id,
        current_user_id: userId,
        has_content: !!operation.content,
      });
      
      // Only apply operations from OTHER users, not from the current user
      if (operation.user_id === userId) {
        console.log('⏭️ DocumentEditor: Skipping own operation');
        return;
      }
      
      if (operation.op !== 'sync' || !operation.content) {
        console.log('⏭️ DocumentEditor: Invalid operation format');
        return;
      }
      
      const editor = editorRef.current;
      if (!editor) {
        console.log('⏭️ DocumentEditor: Editor not available');
        return;
      }
      
      try {
        const parsed = JSON.parse(operation.content);
        if (!parsed || parsed.type !== 'doc') {
          console.log('⏭️ DocumentEditor: Invalid content format');
          return;
        }
        
        console.log('✅ DocumentEditor: Applying remote operation from user', operation.user_id);
        isApplyingRemoteRef.current = true;
        editor.commands.setContent(parsed);
      } catch (error) {
        console.error('❌ DocumentEditor: Failed to apply remote sync:', error);
      } finally {
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 0);
      }
    };
  }, [operationHandlerRef, userId]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    onTitleChange(nextTitle);
  };


  const debouncedSendSync = useDebouncedCallback((payload: string) => {
    console.log('📤 DocumentEditor: Sending sync operation, user_id:', userId);
    if (!onSendOperation) {
      console.warn('⚠️ DocumentEditor: onSendOperation is not available');
      return;
    }
    try {
      onSendOperation({
        user_id: userId,
        op: 'sync',
        position: 0,
        content: payload,
      });
    } catch (error) {
      console.error('❌ DocumentEditor: Failed to send operation:', error);
    }
  }, 400);


  const handleContentChange = (json: any) => {
    const payload = JSON.stringify(json);
    onContentChange(payload);
    if (!isApplyingRemoteRef.current) {
      debouncedSendSync(payload);
    }
    updateOutlineFromEditor();
  };

  const updateOutlineFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextItems: { id: string; level: number; text: string; pos: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const text = node.textContent.trim();
        if (!text) return;
        const level = Number(node.attrs.level) || 1;
        nextItems.push({
          id: `${pos}-${level}-${text.slice(0, 24)}`,
          level,
          text,
          pos,
        });
      }
    });
    setOutlineItems(nextItems);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    updateOutlineFromEditor();
  }, [document.id, initialContent, updateOutlineFromEditor]);


  const sanitizeContext = useCallback((raw: string) => {
    let result = raw || '';
    const removals = [aiResponse, streamingResponse].filter(Boolean) as string[];
    for (const text of removals) {
      if (!text) continue;
      result = result.split(text).join('');
    }
    return result.replace(/\s{2,}/g, ' ').trim();
  }, [aiResponse, streamingResponse]);

  const markdownToHtml = (input: string) => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    let html = escapeHtml(input);
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br />');
    return html;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/') return;
      const editor = editorRef.current;
      if (!editor || !editor.isFocused) return;

      event.preventDefault();
      const { from, to } = editor.state.selection;
      const selected = editor.state.doc.textBetween(from, to);
      setSelectedText(selected || '');
      const coords = editor.view.coordsAtPos(from);
      setCommandMenuPosition({ x: coords.left, y: coords.bottom + 8 });
      setShowCommandMenu(true);
      selectionRef.current = { from, to };
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Color palette feature removed - was causing ReferenceError
  // If needed in the future, add state variables:
  // const [showColorPalette, setShowColorPalette] = useState(false);
  // const [colorPalettePosition, setColorPalettePosition] = useState<{ x: number; y: number } | undefined>();


  const handlePromptSubmit = useCallback(
    async (prompt: string, useSearch: boolean) => {
      setShowCommandMenu(false);
      setIsStreaming(true);
      setAiResponse(null);
      setStreamingResponse('');
      setShowAiPanel(true);
      setLastPrompt(prompt);

      let finalText = '';

      try {
        const editor = editorRef.current;
        const context = sanitizeContext(editor?.getText() || '');
        if (editor) {
          const { to } = selectionRef.current || editor.state.selection;
          aiStreamRangeRef.current = { start: to, end: to };
          aiStreamLengthRef.current = 0;
          aiStreamStartRef.current = to;
        }

        await aiApi.askStreaming(
          {
            context,
            question: prompt,
          },
          (chunk: string) => {
            finalText = chunk;
            setStreamingResponse(chunk);
            const targetEditor = editorRef.current;
            if (!targetEditor || !aiStreamRangeRef.current) return;
            const prevLength = aiStreamLengthRef.current;
            const nextLength = chunk.length;
            if (nextLength <= prevLength) return;
            const delta = chunk.slice(prevLength);
            const { start, end } = aiStreamRangeRef.current;
            targetEditor
              .chain()
              .focus()
              .insertContentAt({ from: end, to: end }, delta)
              .run();
            aiStreamRangeRef.current = { start, end: end + delta.length };
            aiStreamLengthRef.current = nextLength;
          },
          { useWeb: useSearch }
        );

        if (finalText.trim()) {
          setAiResponse(finalText);
          const editor = editorRef.current;
          setShowAiPanel(true);
        } else {
          setAiResponse('No response received from AI. Please try again.');
        }
      } catch (error: any) {
        console.error('AI request failed:', error);
        const errorMessage =
          error?.response?.data?.detail || error?.message || 'Sorry, I encountered an error. Please try again.';
        setAiResponse(`Error: ${errorMessage}`);
        setStreamingResponse('');
        aiStreamRangeRef.current = null;
        aiStreamLengthRef.current = 0;
        aiStreamStartRef.current = null;
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!editorScrollRef.current || !responseRef.current) return;
    if (!aiResponse && !streamingResponse && !isStreaming) return;

    const container = editorScrollRef.current;
    const response = responseRef.current;
    const offsetTop = response.offsetTop - container.offsetTop;

    container.scrollTo({
      top: Math.max(0, offsetTop - 24),
      behavior: 'smooth',
    });
  }, [aiResponse, streamingResponse, isStreaming]);

  const handleInsertResponse = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const textToInsert = streamingResponse || aiResponse || '';
    if (!textToInsert) return;

    editor.chain().focus().insertContent(textToInsert).run();
    setAiResponse(null);
    setStreamingResponse('');
    setShowAiPanel(false);
  }, [aiResponse, streamingResponse]);

  const handleDismissResponse = useCallback(() => {
    const editor = editorRef.current;
    const range = aiStreamRangeRef.current;
    if (editor && range) {
      editor.chain().focus().insertContentAt({ from: range.start, to: range.end }, '').run();
    }
    setAiResponse(null);
    setStreamingResponse('');
    setShowAiPanel(false);
    aiStreamRangeRef.current = null;
    aiStreamStartRef.current = null;
    aiStreamLengthRef.current = 0;
  }, []);

  const handleAcceptResponse = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const range = aiStreamRangeRef.current;
    const textToInsert = streamingResponse || aiResponse || '';
    if (range && textToInsert) {
      const html = markdownToHtml(textToInsert);
      editor.chain().focus().insertContentAt({ from: range.start, to: range.end }, html).run();
    }
    setAiResponse(null);
    setStreamingResponse('');
    setShowAiPanel(false);
    aiStreamRangeRef.current = null;
    aiStreamStartRef.current = null;
    aiStreamLengthRef.current = 0;
  }, [aiResponse, streamingResponse]);

  const handleInsertBelow = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const range = aiStreamRangeRef.current;
    if (!range) return;

    // Extract plain text from selection to reinsert below.
    const textToInsert = streamingResponse || aiResponse || '';
    if (!textToInsert) return;

    // Remove current streamed content.
    editor.chain().focus().insertContentAt({ from: range.start, to: range.end }, '').run();

    // Insert a new paragraph below the original selection end.
    const { to } = selectionRef.current || editor.state.selection;
    const html = markdownToHtml(textToInsert);
    editor.chain().focus().insertContentAt(to, html).run();

    setAiResponse(null);
    setStreamingResponse('');
    setShowAiPanel(false);
    aiStreamRangeRef.current = null;
    aiStreamStartRef.current = null;
    aiStreamLengthRef.current = 0;
  }, [aiResponse, streamingResponse]);

  const handleTryAgain = useCallback(() => {
    if (!lastPrompt) return;
    const editor = editorRef.current;
    const range = aiStreamRangeRef.current;
    if (editor && range) {
      editor.chain().focus().insertContentAt({ from: range.start, to: range.end }, '').run();
      aiStreamRangeRef.current = null;
      aiStreamStartRef.current = null;
      aiStreamLengthRef.current = 0;
    }
    handlePromptSubmit(lastPrompt, false); // useSearch defaults to false
  }, [lastPrompt, handlePromptSubmit]);

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Title bar removed */}

      <div className="flex-1 flex overflow-hidden">
        <div ref={editorScrollRef} className="flex-1 px-6 pt-2 pb-6 overflow-y-auto relative">
          <NotionEditor
            key={document.id}
            initialContent={initialContent}
            onChange={handleContentChange}
            showHeader={false}
            editorRef={editorRef}
          />

          {(aiResponse !== null || streamingResponse || isStreaming) && (
            <div ref={responseRef} className="mt-4 mb-4 px-6 hidden">
              <AIResponseBlock
                response={streamingResponse || aiResponse || ''}
                isLoading={isStreaming}
                onDismiss={handleDismissResponse}
                onInsert={handleInsertResponse}
              />
            </div>
          )}

          {showAiPanel && (aiResponse || streamingResponse || isStreaming) && (
            <div className="mt-3 px-10">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <button
                  className="text-sm font-medium text-gray-900 hover:underline"
                  onClick={handleAcceptResponse}
                >
                  Accept
                </button>
                <button
                  className="text-sm font-medium text-gray-500 hover:underline"
                  onClick={handleDismissResponse}
                >
                  Discard
                </button>
                <button
                  className="text-sm font-medium text-gray-500 hover:underline"
                  onClick={handleInsertBelow}
                >
                  Insert below
                </button>
                <button
                  className="ml-auto text-sm font-medium text-gray-500 hover:underline"
                  onClick={handleTryAgain}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {showOutline && (
          <aside className="group bg-white transition-all duration-200 w-12 hover:w-64 overflow-hidden fixed top-16 right-0 h-[calc(100vh-64px)] z-40">
            <div className="absolute top-3 right-3 h-9 w-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shadow-sm border border-blue-100">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="4" y="6" width="16" height="2" rx="1" />
                <rect x="4" y="11" width="16" height="2" rx="1" />
                <rect x="4" y="16" width="16" height="2" rx="1" />
              </svg>
            </div>
            <div className="h-full px-2 py-4 overflow-y-auto">
              {/* Expanded list only */}
              <div className="hidden group-hover:block">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Outline
                </div>
                {outlineItems.length === 0 ? (
                  <div className="text-sm text-gray-400">No headings yet.</div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {outlineItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex items-center gap-2 rounded px-2 py-1 text-left text-[13px] text-gray-700 hover:bg-gray-100 transition"
                        style={{ marginLeft: (item.level - 1) * 10 }}
                  onClick={() => {
                    const editor = editorRef.current;
                    if (!editor) return;
                    const targetPos = Math.min(item.pos + 1, editor.state.doc.content.size);
                    editor.commands.setTextSelection(targetPos);
                    editor.commands.focus();
                    const container = editorScrollRef.current;
                    if (container) {
                      const rect = container.getBoundingClientRect();
                      const coords = editor.view.coordsAtPos(targetPos);
                      const targetTop = coords.top - rect.top + container.scrollTop - 8;
                      container.scrollTo({
                        top: Math.max(0, targetTop),
                        behavior: 'smooth',
                      });
                    }
                  }}
                >
                        <span className="w-6 text-[10px] font-semibold text-gray-500">H{item.level}</span>
                        <span className="flex-1 truncate">{item.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      <AICommandMenu
        isOpen={showCommandMenu}
        onClose={() => setShowCommandMenu(false)}
        onSubmit={handlePromptSubmit}
        selectedText={selectedText}
        position={commandMenuPosition}
      />
    </div>
  );
};
