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
}

export interface DocumentUpdate {
  title?: string;
  content?: string;
}


export const getDocuments = async (): Promise<Document[]> => {
  const response = await apiClient.get<Document[]>('/documents');
  return response.data;
};

export const getDocument = async (documentId: number): Promise<Document> => {
  const response = await apiClient.get<Document>(`/documents/${documentId}`);
  return response.data;
};

export const createDocument = async (
  document: DocumentCreate
): Promise<Document> => {
  const response = await apiClient.post<Document>('/documents', document);
  return response.data;
};

export const updateDocument = async (
  documentId: number,
  update: DocumentUpdate
): Promise<Document> => {
  const response = await apiClient.put<Document>(`/documents/${documentId}`, update);
  return response.data;
};

export const deleteDocument = async (documentId: number): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}`);
};

