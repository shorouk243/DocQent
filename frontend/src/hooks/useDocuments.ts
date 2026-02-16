import { useState, useCallback, useEffect } from 'react';
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  Document,
  DocumentCreate,
  DocumentUpdate,
} from '../api/documents';

/**
 * Custom hook for managing documents
 * Provides state and functions for document CRUD operations
 */
export const useDocuments = (isAuthenticated: boolean) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all documents for the user on mount or when userId changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllDocuments();
    }
  }, [isAuthenticated]);

  // Fetch all documents (owned + shared)
  const fetchAllDocuments = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch documents';
      setError(errorMessage);
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch a single document
  const fetchDocument = useCallback(async (documentId: number) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await getDocument(documentId);
      setCurrentDocument(doc);
      return doc;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new document
  const createNewDocument = useCallback(async (documentData: DocumentCreate) => {
    setLoading(true);
    setError(null);
    try {
      const newDoc = await createDocument(documentData);
      setDocuments((prev) => [...prev, newDoc]);
      setCurrentDocument(newDoc);
      return newDoc;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to create document';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh documents list (useful after sharing)
  const refreshDocuments = useCallback(() => {
    if (isAuthenticated) {
      fetchAllDocuments();
    }
  }, [isAuthenticated, fetchAllDocuments]);

  // Update a document
  // silent: if true, don't show loading overlay (for debounced saves)
  const updateCurrentDocument = useCallback(
    async (documentId: number, update: DocumentUpdate, silent: boolean = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const updated = await updateDocument(documentId, update);
        setCurrentDocument(updated);
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? updated : doc))
        );
        return updated;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to update document';
        setError(errorMessage);
        throw err;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Delete a document
  const deleteCurrentDocument = useCallback(
    async (documentId: number) => {
      setLoading(true);
      setError(null);
      try {
        await deleteDocument(documentId);
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        if (currentDocument?.id === documentId) {
          setCurrentDocument(null);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to delete document';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentDocument]
  );

  return {
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
  };
};
