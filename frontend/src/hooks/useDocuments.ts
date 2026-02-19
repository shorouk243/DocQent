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

export const useDocuments = (isAuthenticated: boolean) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllDocuments();
    }
  }, [isAuthenticated]);

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
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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

  const refreshDocuments = useCallback(() => {
    if (isAuthenticated) {
      fetchAllDocuments();
    }
  }, [isAuthenticated, fetchAllDocuments]);

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
