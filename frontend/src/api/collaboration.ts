import apiClient from './client';

/**
 * Collaboration API service
 * Handles sharing and removing collaborators from documents
 */

// Share a document with a collaborator
export const shareDocument = async (
  documentId: number,
  collaboratorId: number
): Promise<{ message: string; collaborator_id: number }> => {
  const response = await apiClient.post(
    `/collaboration/share?document_id=${documentId}&collaborator_id=${collaboratorId}`
  );
  return response.data;
};

// Remove a collaborator from a document
export const removeCollaborator = async (
  documentId: number,
  collaboratorId: number
): Promise<{ message: string; collaborator_id: number }> => {
  const response = await apiClient.delete(
    `/collaboration/share?document_id=${documentId}&collaborator_id=${collaboratorId}`
  );
  return response.data;
};
