import React, { useState } from 'react';
import { AIEditor } from '../components/AIEditor';

export const AIEditorPage: React.FC = () => {
  const [content, setContent] = useState('');
  
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          AI Assistant Editor
        </h1>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full bg-white shadow-sm">
          <AIEditor
            initialContent={content}
            onContentChange={setContent}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-4xl mx-auto text-xs text-gray-500">
          <p>Press "/" at the start of a line to open AI commands • Click "AI Assistant" button or select text for context-aware responses</p>
        </div>
      </footer>
    </div>
  );
};
