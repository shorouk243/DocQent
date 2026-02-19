import apiClient from './client';


export const shareDocument = async (
  documentId: number,
  collaboratorId: number
): Promise<{ message: string; collaborator_id: number }> => {
  const response = await apiClient.post(
    `/collaboration/share?document_id=${documentId}&collaborator_id=${collaboratorId}`
  );
  return response.data;
};

export const removeCollaborator = async (
  documentId: number,
  collaboratorId: number
): Promise<{ message: string; collaborator_id: number }> => {
  const response = await apiClient.delete(
    `/collaboration/share?document_id=${documentId}&collaborator_id=${collaboratorId}`
  );
  return response.data;
};
