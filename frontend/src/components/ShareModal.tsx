import React, { useState } from 'react';
import { shareDocument, removeCollaborator } from '../api/collaboration';

interface ShareModalProps {
  documentId: number;
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess?: () => void; // Callback to refresh documents list
}

/**
 * Share modal component for adding/removing collaborators
 * Allows entering a collaborator user_id to share the document
 */
export const ShareModal: React.FC<ShareModalProps> = ({
  documentId,
  isOpen,
  onClose,
  onShareSuccess,
}) => {
  const [collaboratorId, setCollaboratorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShare = async () => {
    const id = parseInt(collaboratorId);
    if (isNaN(id)) {
      setError('Please enter a valid user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await shareDocument(documentId, id);
      setSuccess(`Document shared with user ${id}`);
      setCollaboratorId('');
      // Refresh documents list if callback provided
      if (onShareSuccess) {
        onShareSuccess();
      }
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || 'Failed to share document';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    const id = parseInt(collaboratorId);
    if (isNaN(id)) {
      setError('Please enter a valid user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await removeCollaborator(documentId, id);
      setSuccess(`Collaborator ${id} removed`);
      setCollaboratorId('');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || 'Failed to remove collaborator';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Share Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collaborator User ID
            </label>
            <input
              type="number"
              value={collaboratorId}
              onChange={(e) => setCollaboratorId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">
              {success}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
