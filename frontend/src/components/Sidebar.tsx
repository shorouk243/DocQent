import React from 'react';
import { Document } from '../api/documents';

interface SidebarProps {
  documents: Document[];
  currentDocument: Document | null;
  onNewDocument: () => void;
  onSelectDocument: (document: Document) => void;
  onDeleteDocument: (documentId: number) => void;
  currentUserId: number;
  onRenameCurrent?: (title: string) => void;
}

/**
 * Left sidebar component displaying document list
 * Similar to Google Docs sidebar
 */
export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  currentDocument,
  onNewDocument,
  onSelectDocument,
  onDeleteDocument,
  currentUserId,
  onRenameCurrent,
}) => {
  const [draftTitle, setDraftTitle] = React.useState('');

  React.useEffect(() => {
    setDraftTitle(currentDocument?.title || '');
  }, [currentDocument?.id, currentDocument?.title]);
  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 h-screen flex flex-col sticky top-0">
      {/* New Document Button (top) */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewDocument}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + New Document
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
            Documents
          </h2>
          {documents.length === 0 ? (
            <div className="text-sm text-gray-500 px-2 py-4 text-center">
              No documents yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                    currentDocument?.id === doc.id
                      ? 'bg-blue-50 border border-blue-200'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Document clicked:', doc.id, doc.title);
                    onSelectDocument(doc);
                  }}
                  onMouseDown={(e) => {
                    // Prevent text selection when clicking
                    if (e.detail > 1) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    {currentDocument?.id === doc.id ? (
                      <input
                        className="w-full text-sm font-medium text-gray-900 bg-white border border-blue-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-400"
                        value={draftTitle}
                        placeholder="Untitled Document"
                        onChange={(e) => {
                          setDraftTitle(e.target.value);
                          onRenameCurrent?.(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {doc.title || 'Untitled Document'}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 truncate">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {doc.owner_id === currentUserId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this document?')) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className={`text-red-500 hover:text-red-700 p-1 transition-opacity ${
                        currentDocument?.id === doc.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Delete document"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
