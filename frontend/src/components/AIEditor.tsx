import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { AICommandMenu } from './AICommandMenu';
import { AIResponseBlock } from './AIResponseBlock';
import { aiApi } from '../api/ai';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

interface AIEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export const AIEditor: React.FC<AIEditorProps> = ({
  initialContent = '',
  onContentChange,
}) => {
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuPosition, setCommandMenuPosition] = useState<{ x: number; y: number } | undefined>();
  const [selectedText, setSelectedText] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Use refs to access state in handleKeyDown
  const menuStateRef = useRef({ showCommandMenu: false, setShowCommandMenu, setSelectedText, setCommandMenuPosition });

  useEffect(() => {
    menuStateRef.current = { showCommandMenu, setShowCommandMenu, setSelectedText, setCommandMenuPosition };
  }, [showCommandMenu, setShowCommandMenu, setSelectedText, setCommandMenuPosition]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing or press "/" for AI commands...',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange?.(html);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] px-4 py-8 text-gray-900 dark:text-gray-100',
      },
      handleKeyDown: (view, event) => {
        // Handle "/" command - trigger anywhere for better UX
        if (event.key === '/' && !menuStateRef.current.showCommandMenu) {
          const { selection } = view.state;
          const { from } = selection;
          
          event.preventDefault();
          event.stopPropagation();
          
          // Get any selected text
          const { from: selFrom, to: selTo } = selection;
          const selected = view.state.doc.textBetween(selFrom, selTo);
          
          menuStateRef.current.setSelectedText(selected || '');
          
          // Calculate menu position using getBoundingClientRect for accurate positioning
          const coords = view.coordsAtPos(from);
          
          menuStateRef.current.setCommandMenuPosition({
            x: coords.left,
            y: coords.bottom + 8,
          });
          
          menuStateRef.current.setShowCommandMenu(true);
          return true;
        }
        return false;
      },
    },
  });


  // Auto-focus editor on mount
  useEffect(() => {
    if (editor) {
      // Small delay to ensure editor is fully rendered
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    }
  }, [editor]);
  
  // Add global keyboard listener as fallback for "/" command
  useEffect(() => {
    if (!editor) return;
    
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle if editor is focused and "/" is pressed
      if (event.key === '/' && !showCommandMenu && document.activeElement?.closest('.ProseMirror')) {
        const { selection } = editor.state;
        const { from } = selection;
        
        event.preventDefault();
        event.stopPropagation();
        
        const { from: selFrom, to: selTo } = selection;
        const selected = editor.state.doc.textBetween(selFrom, selTo);
        
        setSelectedText(selected || '');
        
        const coords = editor.view.coordsAtPos(from);
        setCommandMenuPosition({
          x: coords.left,
          y: coords.bottom + 8,
        });
        
        setShowCommandMenu(true);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [editor, showCommandMenu]);

  // Handle text selection - show menu when text is selected
  useEffect(() => {
    if (!editor) return;

    let selectionTimeout: ReturnType<typeof setTimeout>;

    const handleSelectionUpdate = () => {
      const { selection } = editor.state;
      const { from, to } = selection;
      
      // Clear any pending timeout
      clearTimeout(selectionTimeout);
      
      if (from !== to) {
        const selected = editor.state.doc.textBetween(from, to);
        setSelectedText(selected);
        
        // Show menu when text is selected (with small delay to avoid flickering)
        if (selected.trim().length > 0) {
          selectionTimeout = setTimeout(() => {
            if (!showCommandMenu) {
              const coords = editor.view.coordsAtPos(to);
              setCommandMenuPosition({
                x: coords.left,
                y: coords.bottom + 8,
              });
              setShowCommandMenu(true);
            }
          }, 150); // Reduced delay for better responsiveness
        }
      } else {
        setSelectedText('');
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      clearTimeout(selectionTimeout);
    };
  }, [editor, showCommandMenu]);

  const sanitizeContext = useCallback((raw: string) => {
    let result = raw || '';
    const removals = [aiResponse, streamingResponse].filter(Boolean) as string[];
    for (const text of removals) {
      if (!text) continue;
      result = result.split(text).join('');
    }
    return result.replace(/\s{2,}/g, ' ').trim();
  }, [aiResponse, streamingResponse]);

  const handlePromptSubmit = useCallback(async (prompt: string, useSearch: boolean) => {
    setShowCommandMenu(false);
    setIsStreaming(true);
    setAiResponse(null);
    setStreamingResponse('');

    let finalResponse = '';

    try {
      // Get current document content as context
      const context = sanitizeContext(editor?.getText() || '');
      
      // Use streaming API
      await aiApi.askStreaming(
        {
          context,
          question: prompt,
        },
        (chunk: string) => {
          finalResponse = chunk;
          setStreamingResponse(finalResponse);
        },
        { useWeb: useSearch }
      );

      // After streaming completes, set the final response
      setAiResponse(finalResponse);
    } catch (error) {
      console.error('AI request failed:', error);
      setAiResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  }, [editor]);

  const handleInsertResponse = useCallback(() => {
    if (!editor) return;
    
    // Use streaming response if available, otherwise use final response
    const textToInsert = streamingResponse || aiResponse || '';
    if (!textToInsert) return;

    const { selection } = editor.state;
    const { from } = selection;

    // Insert the AI response at the current cursor position
    editor.chain().focus().setTextSelection(from).insertContent(textToInsert).run();
    
    setAiResponse(null);
    setStreamingResponse('');
  }, [editor, aiResponse, streamingResponse]);

  const handleDismissResponse = useCallback(() => {
    setAiResponse(null);
    setStreamingResponse('');
  }, []);

  const handleOpenCommandMenu = useCallback(() => {
    if (!editor) return;

    const { selection } = editor.state;
    const { from } = selection;
    const coords = editor.view.coordsAtPos(from);
    
    setCommandMenuPosition({
      x: coords.left,
      y: coords.top + 20,
    });
    
    const { from: selFrom, to: selTo } = selection;
    const selected = editor.state.doc.textBetween(selFrom, selTo);
    setSelectedText(selected || '');
    
    setShowCommandMenu(true);
  }, [editor]);

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenCommandMenu}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Assistant</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white min-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            style={{
              color: 'inherit',
            }}
          >
            <style>{`
              .ProseMirror {
                color: rgb(17, 24, 39) !important;
                background-color: white !important;
              }
              .ProseMirror p {
                color: rgb(17, 24, 39) !important;
              }
              .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
                color: rgb(17, 24, 39) !important;
              }
              .ProseMirror::placeholder {
                color: rgb(156, 163, 175) !important;
              }
            `}</style>
            <EditorContent editor={editor} />
          </div>
          
          {/* AI Response Block - Inline */}
          {(aiResponse !== null || streamingResponse || isStreaming) && (
            <div className="px-4 pb-4">
              <AIResponseBlock
                response={streamingResponse || aiResponse || ''}
                isLoading={isStreaming}
                onDismiss={handleDismissResponse}
                onInsert={handleInsertResponse}
              />
            </div>
          )}
        </div>
      </div>

      {/* Command Menu */}
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
