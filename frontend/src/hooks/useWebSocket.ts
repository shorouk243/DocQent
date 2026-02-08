import { useEffect, useRef, useCallback, useState } from 'react';
import { websocketService, WebSocketOperation } from '../services/websocket';

/**
 * Custom hook for managing WebSocket connection for real-time collaboration
 * 
 * This hook:
 * - Connects to WebSocket when documentId and userId are provided
 * - Handles incoming operations from other users
 * - Provides a function to send operations
 * - Tracks connection status in real-time
 * - Automatically disconnects on unmount
 */
export const useWebSocket = (
  documentId: number | null,
  userId: number | null,
  onOperation: (operation: WebSocketOperation) => void
) => {
  const onOperationRef = useRef(onOperation);
  const [isConnected, setIsConnected] = useState(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the callback ref updated
  useEffect(() => {
    onOperationRef.current = onOperation;
  }, [onOperation]);

  // Send operation function
  const sendOperation = useCallback(
    (operation: WebSocketOperation) => {
      if (documentId && userId) {
        websocketService.sendOperation(operation);
      }
    },
    [documentId, userId]
  );

  // Track previous IDs to prevent unnecessary reconnections
  const prevIdsRef = useRef<{ documentId: number | null; userId: number | null }>({
    documentId: null,
    userId: null,
  });

  // Connect/disconnect effect
  useEffect(() => {
    // Only reconnect if IDs actually changed
    const idsChanged = 
      prevIdsRef.current.documentId !== documentId || 
      prevIdsRef.current.userId !== userId;

    if (documentId && userId) {
      // Only connect if IDs changed or not already connected
      if (idsChanged || !websocketService.isConnected()) {
      console.log(`🔗 useWebSocket: Connecting to document ${documentId} as user ${userId}`);
      
      const handleMessage = (operation: WebSocketOperation) => {
        onOperationRef.current(operation);
      };

      const handleError = (error: Event) => {
        console.error('❌ useWebSocket: WebSocket error:', error);
        console.error('   Document ID:', documentId);
        console.error('   User ID:', userId);
        setIsConnected(false);
      };

      const handleClose = () => {
        console.log('⚠️ useWebSocket: WebSocket connection closed');
        console.log('   Document ID:', documentId);
        console.log('   User ID:', userId);
        setIsConnected(false);
      };

      // Connect to WebSocket
      websocketService.connect(
        documentId,
        userId,
        handleMessage,
        handleError,
        handleClose
      );

        // Update previous IDs
        prevIdsRef.current = { documentId, userId };
      }

      // Check connection status periodically (only if connected)
      if (!checkIntervalRef.current) {
      checkIntervalRef.current = setInterval(() => {
        const connected = websocketService.isConnected();
        setIsConnected(connected);
        }, 2000); // Check every 2 seconds (reduced frequency to avoid overhead)
      }

      // Initial connection check
      setTimeout(() => {
        setIsConnected(websocketService.isConnected());
      }, 100);

    } else {
      setIsConnected(false);
      // Update previous IDs even when null
      prevIdsRef.current = { documentId, userId };
      // Clean up interval if no connection needed
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }

      // Cleanup on unmount or when documentId/userId changes
      return () => {
      // Always clean up interval
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      // Disconnect if IDs changed (to avoid disconnecting during re-renders with same IDs)
      // Note: On unmount, this will also run but that's fine - we want to disconnect
      const currentIdsChanged = 
        prevIdsRef.current.documentId !== documentId || 
        prevIdsRef.current.userId !== userId;
      
      if (currentIdsChanged || !documentId || !userId) {
        websocketService.disconnect();
        setIsConnected(false);
      }
      };
  }, [documentId, userId]);

  return { sendOperation, isConnected };
};
