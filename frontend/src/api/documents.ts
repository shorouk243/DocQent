import apiClient from './client';

export interface Document {
  id: number;
  title: string;
  content: string;
  owner_id: number;
  created_at: string;
}

export interface DocumentCreate {
  title: string;
  content: string;
  owner_id: number;
}

export interface DocumentUpdate {
  title?: string;
  content?: string;
}

/**
 * Document API service
 * Handles all REST API calls for document CRUD operations
 */

// Get all documents for a user (owned + shared)
export const getDocuments = async (userId: number): Promise<Document[]> => {
  const response = await apiClient.get<Document[]>(`/documents?user_id=${userId}`);
  return response.data;
};

// Get a single document by ID
export const getDocument = async (documentId: number): Promise<Document> => {
  const response = await apiClient.get<Document>(`/documents/${documentId}`);
  return response.data;
};

// Create a new document
export const createDocument = async (
  document: DocumentCreate
): Promise<Document> => {
  const response = await apiClient.post<Document>('/documents', document);
  return response.data;
};

// Update an existing document
export const updateDocument = async (
  documentId: number,
  update: DocumentUpdate,
  userId: number
): Promise<Document> => {
  const response = await apiClient.put<Document>(
    `/documents/${documentId}?user_id=${userId}`,
    update
  );
  return response.data;
};

// Delete a document
export const deleteDocument = async (
  documentId: number,
  userId: number
): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}?user_id=${userId}`);
};

// Note: Backend doesn't have a list endpoint yet
// For now, we'll work with individual document fetches
// You may want to add: GET /documents?owner_id={owner_id} to the backend

