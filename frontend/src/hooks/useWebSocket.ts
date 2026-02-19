import { useEffect, useRef, useCallback, useState } from 'react';
import { websocketService, WebSocketOperation } from '../services/websocket';

export const useWebSocket = (
  documentId: number | null,
  userId: number | null,
  accessToken: string | null,
  onOperation: (operation: WebSocketOperation) => void
) => {
  const onOperationRef = useRef(onOperation);
  const [isConnected, setIsConnected] = useState(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onOperationRef.current = onOperation;
  }, [onOperation]);

  const sendOperation = useCallback(
    (operation: WebSocketOperation) => {
      if (documentId && userId && accessToken) {
        websocketService.sendOperation(operation);
      }
    },
    [documentId, userId, accessToken]
  );

  const prevIdsRef = useRef<{ documentId: number | null; userId: number | null; accessToken: string | null }>({
    documentId: null,
    userId: null,
    accessToken: null,
  });

  useEffect(() => {
    const idsChanged = 
      prevIdsRef.current.documentId !== documentId || 
      prevIdsRef.current.userId !== userId ||
      prevIdsRef.current.accessToken !== accessToken;

    if (documentId && userId && accessToken) {
      if (idsChanged || !websocketService.isConnected()) {
      
      const handleMessage = (operation: WebSocketOperation) => {
        onOperationRef.current(operation);
      };

      const handleError = (error: Event) => {
        setIsConnected(false);
      };

      const handleClose = () => {
        setIsConnected(false);
      };

      websocketService.connect(
        documentId,
        userId,
        accessToken,
        handleMessage,
        handleError,
        handleClose
      );

        prevIdsRef.current = { documentId, userId, accessToken };
      }

      if (!checkIntervalRef.current) {
      checkIntervalRef.current = setInterval(() => {
        const connected = websocketService.isConnected();
        setIsConnected(connected);
        }, 2000); // Check every 2 seconds (reduced frequency to avoid overhead)
      }

      setTimeout(() => {
        setIsConnected(websocketService.isConnected());
      }, 100);

    } else {
      setIsConnected(false);
      prevIdsRef.current = { documentId, userId, accessToken };
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }

      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      const currentIdsChanged = 
        prevIdsRef.current.documentId !== documentId || 
        prevIdsRef.current.userId !== userId ||
        prevIdsRef.current.accessToken !== accessToken;
      
      if (currentIdsChanged || !documentId || !userId || !accessToken) {
        websocketService.disconnect();
        setIsConnected(false);
      }
      };
  }, [documentId, userId, accessToken]);

  return { sendOperation, isConnected };
};
