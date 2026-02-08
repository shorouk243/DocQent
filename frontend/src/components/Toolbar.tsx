import React from 'react';

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onHeading: (level: 1 | 2 | 3 | 4) => void;
}

/**
 * Top toolbar component with formatting options
 * Basic formatting buttons (Bold, Italic, Underline, Headings)
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onHeading,
}) => {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center gap-2">
      {/* Bold */}
      <button
        onClick={onBold}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Bold"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 4a1 1 0 011-1h4a1 1 0 011 1v1H7a1 1 0 00-1 1v2a1 1 0 001 1h3a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1V4zm7 0a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </button>

      {/* Italic */}
      <button
        onClick={onItalic}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Italic"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 2a1 1 0 011 1v1h2a1 1 0 110 2H9v6h2a1 1 0 110 2H9v1a1 1 0 11-2 0V4a1 1 0 011-1z" />
        </svg>
      </button>

      {/* Underline */}
      <button
        onClick={onUnderline}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Underline"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 3a1 1 0 011 1v6a3 3 0 006 0V4a1 1 0 112 0v6a5 5 0 01-10 0V4a1 1 0 011-1zm-1 13a1 1 0 112 0 1 1 0 01-2 0z" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onHeading(1)}
          className="px-2 py-1 text-sm font-semibold hover:bg-gray-100 rounded transition-colors"
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => onHeading(2)}
          className="px-2 py-1 text-sm font-semibold hover:bg-gray-100 rounded transition-colors"
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => onHeading(3)}
          className="px-2 py-1 text-sm font-semibold hover:bg-gray-100 rounded transition-colors"
          title="Heading 3"
        >
          H3
        </button>
        <button
          onClick={() => onHeading(4)}
          className="px-2 py-1 text-sm font-semibold hover:bg-gray-100 rounded transition-colors"
          title="Heading 4"
        >
          H4
        </button>
      </div>
    </div>
  );
};
