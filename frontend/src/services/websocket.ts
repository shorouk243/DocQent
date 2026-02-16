/**
 * WebSocket Service for Real-time Collaboration
 * 
 * This service manages WebSocket connections for real-time document editing.
 * 
 * FLOW:
 * 1. Connect to: ws://localhost:8000/ws/collaboration/{document_id}?token={jwt}
 * 2. On text change in editor:
 *    - Calculate the operation (insert/delete) with position
 *    - Send operation via WebSocket: { user_id, op, position, text, length? }
 * 3. On receiving WebSocket message:
 *    - Parse the operation from another user
 *    - Apply it to the editor content
 *    - Update UI in real-time
 * 
 * IMPORTANT: Avoid infinite loops
 * - Track the user_id of the current user
 * - Only apply operations from OTHER users
 * - Don't send operations for changes that came from WebSocket
 */

export interface WebSocketOperation {
  user_id: number;
  op: 'insert' | 'delete' | 'sync';
  position: number;
  text?: string;
  length?: number;
  content?: string;
}

export type WebSocketMessageHandler = (operation: WebSocketOperation) => void;
export type WebSocketErrorHandler = (error: Event) => void;
export type WebSocketCloseHandler = () => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private documentId: number | null = null;
  private userId: number | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualClose = false;

  /**
   * Connect to WebSocket endpoint for document collaboration
   */
  connect(
    documentId: number,
    userId: number,
    token: string,
    onMessage: WebSocketMessageHandler,
    onError?: WebSocketErrorHandler,
    onClose?: WebSocketCloseHandler
  ): void {
    // Close existing connection if any
    if (this.ws) {
      this.disconnect();
    }

    this.documentId = documentId;
    this.userId = userId;
    this.token = token;
    this.isManualClose = false;
    this.reconnectAttempts = 0;

    const wsUrl = `ws://localhost:8000/ws/collaboration/${documentId}?token=${encodeURIComponent(token)}`;
    
    console.log(`🔌 Attempting WebSocket connection:`);
    console.log(`   URL: ${wsUrl}`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   User ID: ${userId}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      console.log(`   WebSocket object created, waiting for connection...`);

      this.ws.onopen = () => {
        console.log(`✅ WebSocket connected for document ${documentId} (user ${userId})`);
        console.log(`WebSocket URL: ${wsUrl}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const operation: WebSocketOperation = JSON.parse(event.data);
          console.log('🔔 WebSocket: Received message:', {
            op: operation.op,
            user_id: operation.user_id,
            has_content: !!operation.content,
          });
          
          // Forward all operations (including same user_id) to avoid missing updates
          // The editor side will handle avoiding feedback loops.
          onMessage(operation);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket URL:', wsUrl);
        console.error('Make sure Redis is running and backend WebSocket endpoint is accessible');
        if (onError) {
          onError(error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`⚠️ WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
        if (event.code !== 1000) { // 1000 = normal closure
          console.error('WebSocket closed unexpectedly. Check if Redis is running.');
        }
        if (onClose) {
          onClose();
        }

        // Attempt to reconnect if not manually closed
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
          
          setTimeout(() => {
            if (this.documentId && this.userId && this.token) {
              this.connect(this.documentId, this.userId, this.token, onMessage, onError, onClose);
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      console.error('WebSocket URL:', wsUrl);
      console.error('Possible causes:');
      console.error('  1. Redis is not running (required for WebSocket collaboration)');
      console.error('  2. Backend WebSocket endpoint is not accessible');
      console.error('  3. Network/firewall issues');
      if (onError) {
        onError(error as Event);
      }
    }
  }

  /**
   * Send an operation to the WebSocket server
   * This will be broadcast to all other collaborators via Redis
   */
  sendOperation(operation: WebSocketOperation): void {
    if (!this.ws) {
      console.warn('⚠️ WebSocket: No WebSocket instance. Cannot send operation.');
      return;
    }
    
    const state = this.ws.readyState;
    if (state === WebSocket.OPEN) {
      console.log('📡 WebSocket: Sending operation:', {
        op: operation.op,
        user_id: operation.user_id,
        has_content: !!operation.content,
        document_id: this.documentId,
      });
      try {
        this.ws.send(JSON.stringify(operation));
      } catch (error) {
        console.error('❌ WebSocket: Error sending operation:', error);
      }
    } else {
      const stateNames = {
        [WebSocket.CONNECTING]: 'CONNECTING',
        [WebSocket.OPEN]: 'OPEN',
        [WebSocket.CLOSING]: 'CLOSING',
        [WebSocket.CLOSED]: 'CLOSED',
      };
      console.warn('⚠️ WebSocket: Not connected. Cannot send operation.', {
        state: stateNames[state] || `UNKNOWN (${state})`,
        document_id: this.documentId,
        user_id: this.userId,
      });
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.documentId = null;
    this.userId = null;
    this.token = null;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    if (!this.ws) {
      return false;
    }
    // WebSocket.OPEN = 1
    return this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state for debugging
   */
  getConnectionState(): string {
    if (!this.ws) {
      return 'No WebSocket instance';
    }
    const states = {
      [WebSocket.CONNECTING]: 'CONNECTING',
      [WebSocket.OPEN]: 'OPEN',
      [WebSocket.CLOSING]: 'CLOSING',
      [WebSocket.CLOSED]: 'CLOSED',
    };
    return states[this.ws.readyState] || `UNKNOWN (${this.ws.readyState})`;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
