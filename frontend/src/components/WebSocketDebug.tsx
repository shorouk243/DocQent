import React, { useState } from 'react';

interface WebSocketDebugProps {
  documentId: number | null;
  userId: number | null;
  isConnected: boolean;
}

export const WebSocketDebug: React.FC<WebSocketDebugProps> = ({
  documentId,
  userId,
  isConnected,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!documentId || !userId) {
    return (
      <div className="text-xs text-gray-400 p-2">
        No document selected or user not logged in
      </div>
    );
  }

  const wsUrl = `ws://localhost:8000/ws/collaboration/${documentId}?token=<jwt>`;

  return (
    <div className="border border-gray-200 rounded p-2 bg-gray-50 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">WebSocket Debug Info</span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>
      
      <div className="space-y-1">
        <div>
          <span className="font-medium">Status:</span>{' '}
          {isConnected ? (
            <span className="text-green-600">● Connected</span>
          ) : (
            <span className="text-red-600">○ Disconnected</span>
          )}
        </div>
        
        {showDetails && (
          <div className="mt-2 space-y-1 text-gray-600">
            <div>
              <span className="font-medium">Document ID:</span> {documentId}
            </div>
            <div>
              <span className="font-medium">User ID:</span> {userId}
            </div>
            <div>
              <span className="font-medium">WebSocket URL:</span>
              <div className="font-mono text-xs break-all mt-1">{wsUrl}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="font-medium mb-1">How to test:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open browser console (F12)</li>
                <li>Look for WebSocket connection messages</li>
                <li>Check for errors in red</li>
                <li>Verify Redis is running: <code className="bg-gray-200 px-1 rounded">redis-cli ping</code></li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
