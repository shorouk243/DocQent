import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Wand2, ArrowRight, Briefcase, Smile, Lightbulb } from 'lucide-react';

export interface AICommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

const AI_ACTIONS: AICommand[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Create a concise summary',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Summarize the following text in a clear and concise way:',
  },
  {
    id: 'fix-grammar',
    label: 'Fix Grammar',
    description: 'Correct grammar and spelling',
    icon: <Wand2 className="w-4 h-4" />,
    prompt: 'Fix the grammar and spelling errors in the following text:',
  },
  {
    id: 'professional-formal',
    label: 'Professional/Formal',
    description: 'Useful for business emails or technical reports',
    icon: <Briefcase className="w-4 h-4" />,
    prompt: 'Rewrite the following text in a professional, formal tone:',
  },
  {
    id: 'casual-friendly',
    label: 'Casual/Friendly',
    description: 'Good for blog posts or internal team chats',
    icon: <Smile className="w-4 h-4" />,
    prompt: 'Rewrite the following text in a casual, friendly tone:',
  },
  {
    id: 'simplify-el5',
    label: 'Simplify (EL5)',
    description: 'Explain Like I’m 5 in plain English',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Explain the following in very simple terms (EL5):',
  },
  {
    id: 'refine-docs',
    label: 'Refine Docs',
    description: 'Improve clarity, structure, and flow',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Refine the following documentation for clarity, structure, and flow:',
  },
];

interface AICommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, useSearch: boolean) => void;
  selectedText?: string;
  position?: { x: number; y: number };
}

export const AICommandMenu: React.FC<AICommandMenuProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedText,
  position,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [useSearch, setUseSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when menu opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setSelectedActionIndex(null);
      setUseSearch(false);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle action selection
  const handleActionSelect = (action: AICommand) => {
    let prompt = action.prompt;
    if (selectedText) {
      prompt += `\n\n${selectedText}`;
    }
    onSubmit(prompt, useSearch);
  };

  // Handle custom prompt submission
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue.trim(), useSearch);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedActionIndex((prev) => 
          prev === null ? 0 : Math.min(prev + 1, AI_ACTIONS.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedActionIndex((prev) => 
          prev === null ? AI_ACTIONS.length - 1 : Math.max(prev - 1, 0)
        );
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (selectedActionIndex !== null && AI_ACTIONS[selectedActionIndex]) {
          handleActionSelect(AI_ACTIONS[selectedActionIndex]);
        } else if (inputValue.trim()) {
          handleSubmit();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedActionIndex, inputValue]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate position with fallback and boundary checks
  const getMenuStyle = () => {
    if (!position) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
      };
    }

    const menuWidth = 360;
    const menuHeight = 300; // Approximate height
    const padding = 16;

    // Calculate position with boundary checks
    let left = position.x;
    let top = position.y;

    // Prevent going off the right edge
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    // Prevent going off the left edge
    if (left < padding) {
      left = padding;
    }

    // Prevent going off the bottom edge
    if (top + menuHeight > window.innerHeight - padding) {
      top = position.y - menuHeight - 20; // Show above cursor instead
    }

    // Prevent going off the top edge
    if (top < padding) {
      top = padding;
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'none',
      position: 'fixed' as const,
    };
  };

  const menuStyle = getMenuStyle();

  return (
    <AnimatePresence>
      <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[99999]"
          style={menuStyle}
        >
        <div className="bg-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 w-[360px] overflow-hidden">
          {/* Input field */}
          <form onSubmit={handleSubmit} className="border-b border-gray-100">
            <div className="px-4 py-3 bg-white">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask AI to write or edit..."
                className="w-full text-sm text-gray-900 placeholder:text-gray-400 bg-white border-none outline-none focus:outline-none font-[inherit]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>
            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={() => setUseSearch((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  useSearch
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                aria-pressed={useSearch}
              >
                Use web
              </button>
            </div>
          </form>

          {/* AI Actions List */}
          <div className="max-h-[280px] overflow-y-auto bg-white">
            {AI_ACTIONS.map((action, index) => (
              <motion.button
                key={action.id}
                type="button"
                onClick={() => handleActionSelect(action)}
                onMouseEnter={() => setSelectedActionIndex(index)}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors bg-white ${
                  index === selectedActionIndex
                    ? 'bg-white'
                    : 'hover:bg-white'
                }`}
              >
                <div className="text-gray-500 flex-shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {action.description}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </motion.button>
            ))}
          </div>

          {/* Selected text indicator (subtle) */}
          {selectedText && (
            <div className="px-4 py-2 bg-white border-t border-gray-100">
              <div className="text-xs text-gray-500 truncate">
                Selected: {selectedText.length > 40
                  ? `${selectedText.substring(0, 40)}...`
                  : selectedText}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
