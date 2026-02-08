import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { Sidebar } from '../components/Sidebar';
import { ShareModal } from '../components/ShareModal';
import { DocumentEditor } from '../components/DocumentEditor';
import { WebSocketOperation } from '../services/websocket';
import { Document } from '../api/documents';

/**
 * Main Document Editor Page
 * 
 * This page integrates:
 * - Document CRUD operations
 * - WebSocket real-time collaboration
 * - UI components (Sidebar, Toolbar, Editor, Share Modal)
 */
export const DocumentEditorPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if user is not available (shouldn't happen due to ProtectedRoute, but safety check)
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocument,
    createNewDocument,
    updateCurrentDocument,
    deleteCurrentDocument,
    setCurrentDocument,
    refreshDocuments,
  } = useDocuments(user?.id || null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const operationHandlerRef = useRef<((op: WebSocketOperation) => void) | null>(null);
  const [showFloatingNewDoc, setShowFloatingNewDoc] = useState(false);
  const latestContentRef = useRef<string>('');
  const lastSavedContentRef = useRef<string>('');
  const dirtyContentRef = useRef(false);
  const savingRef = useRef(false);

  // Handle WebSocket operations
  const handleWebSocketOperation = useCallback(
    (operation: WebSocketOperation) => {
      // Apply operation to the editor via the ref
      if (operationHandlerRef.current) {
        operationHandlerRef.current(operation);
      }
    },
    []
  );

  // Setup WebSocket connection (only if we have both document and user)
  const { sendOperation, isConnected: wsConnected } = useWebSocket(
    currentDocument?.id || null,
    user?.id || null, // Use null instead of 0 to prevent invalid connections
    handleWebSocketOperation
  );

  // Update connection status
  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  useEffect(() => {
    const onScroll = () => {
      setShowFloatingNewDoc(window.scrollY > 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  // Handle new document creation
  const handleNewDocument = async () => {
    if (!user) return;
    try {
      const newDoc = await createNewDocument({
        title: 'Untitled Document',
        content: '',
        owner_id: user.id,
      });
      setCurrentDocument(newDoc);
    } catch (err) {
      console.error('Failed to create document:', err);
      alert('Failed to create document. Please try again.');
    }
  };

  // Handle document selection
  const handleSelectDocument = useCallback(async (document: Document) => {
    // Don't do anything if already selected
    if (currentDocument?.id === document.id) {
      console.log('Document already selected:', document.id);
      return;
    }
    
    try {
      console.log('Selecting document:', document.id, document.title);
      // Set document immediately for better UX (optimistic update)
      setCurrentDocument(document);
      
      // Then fetch latest version from server in background
      try {
      const doc = await fetchDocument(document.id);
        console.log('Document fetched, updating current:', doc.id);
      setCurrentDocument(doc);
      } catch (fetchErr) {
        console.error('Failed to fetch document, using cached version:', fetchErr);
        // Keep the document we set optimistically
      }
    } catch (err) {
      console.error('Failed to select document:', err);
      alert('Failed to load document. Please try again.');
    }
  }, [currentDocument, fetchDocument]);


  // Handle document deletion
  const handleDeleteDocument = async (documentId: number) => {
    if (!user) return;
    try {
      await deleteCurrentDocument(documentId, user.id);
      if (currentDocument?.id === documentId) {
        setCurrentDocument(null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  // Save functions (receive documentId/userId as args to avoid stale closure when debounce fires)
  // Use silent=true to prevent loading overlay from showing during typing
  const saveTitle = useCallback(
    async (documentId: number, userId: number, title: string) => {
      try {
        await updateCurrentDocument(documentId, { title }, userId, true);
      } catch (err) {
        console.error('Failed to update title:', err);
      }
    },
    [updateCurrentDocument]
  );

  const saveContent = useCallback(
    async (documentId: number, userId: number, content: string) => {
      try {
        await updateCurrentDocument(documentId, { content }, userId, true);
        lastSavedContentRef.current = content;
      } catch (err) {
        console.error('Failed to update content:', err);
      }
    },
    [updateCurrentDocument]
  );

  const debouncedSaveTitle = useDebouncedCallback(saveTitle, 500);
  const debouncedSaveContent = useDebouncedCallback(saveContent, 1000);

  // Handle title change with debounced save
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!currentDocument || !user) return;
      debouncedSaveTitle(currentDocument.id, user.id, title);
    },
    [currentDocument, user, debouncedSaveTitle]
  );

  // Handle content change with debounced save
  const handleContentChange = useCallback(
    (content: string) => {
      if (!currentDocument || !user) return;
      latestContentRef.current = content;
      dirtyContentRef.current = true;
      debouncedSaveContent(currentDocument.id, user.id, content);
    },
    [currentDocument, user, debouncedSaveContent]
  );

  const flushContentSave = useCallback(async () => {
    if (!currentDocument || !user) return;
    const latest = latestContentRef.current;
    if (!latest || latest === lastSavedContentRef.current) return;
    try {
      await updateCurrentDocument(currentDocument.id, { content: latest }, user.id, true);
      lastSavedContentRef.current = latest;
    } catch (err) {
      console.error('Failed to flush content save:', err);
    }
  }, [currentDocument, user, updateCurrentDocument]);

  useEffect(() => {
    if (!currentDocument) return;
    latestContentRef.current = currentDocument.content || '';
    lastSavedContentRef.current = currentDocument.content || '';
    dirtyContentRef.current = false;
  }, [currentDocument?.id, currentDocument?.content]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        void flushContentSave();
      }
    };
    const onBeforeUnload = () => {
      void flushContentSave();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    const interval = window.setInterval(() => {
      void flushContentSave();
    }, 15000);
    const fastInterval = window.setInterval(() => {
      if (!currentDocument || !user) return;
      if (!dirtyContentRef.current || savingRef.current) return;
      const latest = latestContentRef.current;
      if (!latest || latest === lastSavedContentRef.current) {
        dirtyContentRef.current = false;
        return;
      }
      savingRef.current = true;
      updateCurrentDocument(currentDocument.id, { content: latest }, user.id, true)
        .then(() => {
          lastSavedContentRef.current = latest;
          dirtyContentRef.current = false;
        })
        .catch((err) => {
          console.error('Failed to autosave content:', err);
        })
        .finally(() => {
          savingRef.current = false;
        });
    }, 2000);
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.clearInterval(interval);
      window.clearInterval(fastInterval);
    };
  }, [flushContentSave, currentDocument, user, updateCurrentDocument]);

  // Handle sending operation via WebSocket
  const handleSendOperation = useCallback(
    (operation: WebSocketOperation) => {
      sendOperation(operation);
    },
    [sendOperation]
  );


  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Bar with User Info and Share Button */}
      <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">
            {currentDocument?.title || 'Document'}
          </h1>
          {currentDocument && (
            <div className="flex items-center gap-2" />
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">
              Welcome, <span className="font-medium">{user.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
          {/* Share Button */}
          {currentDocument && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Share
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          documents={documents}
          currentDocument={currentDocument}
          onNewDocument={handleNewDocument}
          onSelectDocument={handleSelectDocument}
          onDeleteDocument={handleDeleteDocument}
          currentUserId={user.id}
          onRenameCurrent={handleTitleChange}
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {currentDocument ? (
            <DocumentEditor
              document={currentDocument}
              userId={user.id}
              onTitleChange={handleTitleChange}
              onContentChange={handleContentChange}
              onSendOperation={handleSendOperation}
              operationHandlerRef={operationHandlerRef}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No document selected</p>
                <p className="text-sm">Create a new document or select one from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {currentDocument && user && (
        <ShareModal
          documentId={currentDocument.id}
          userId={user.id}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onShareSuccess={refreshDocuments}
        />
      )}

      {showFloatingNewDoc && (
        <button
          onClick={handleNewDocument}
          className="fixed bottom-6 left-6 z-50 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-full shadow-lg transition-colors"
        >
          + New Document
        </button>
      )}


      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* Loading Overlay - Only show for initial load, not for document selection */}
      {loading && !currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-white rounded-lg p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}
    </div>
  );
};
