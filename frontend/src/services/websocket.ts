
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

  connect(
    documentId: number,
    userId: number,
    token: string,
    onMessage: WebSocketMessageHandler,
    onError?: WebSocketErrorHandler,
    onClose?: WebSocketCloseHandler
  ): void {
    if (this.ws) {
      this.disconnect();
    }

    this.documentId = documentId;
    this.userId = userId;
    this.token = token;
    this.isManualClose = false;
    this.reconnectAttempts = 0;

    const wsUrl = `ws://localhost:8000/ws/collaboration/${documentId}?token=${encodeURIComponent(token)}`;
    
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const operation: WebSocketOperation = JSON.parse(event.data);
          onMessage(operation);
        } catch (error) {
        }
      };

      this.ws.onerror = (error) => {
        if (onError) {
          onError(error);
        }
      };

      this.ws.onclose = (event) => {
        if (onClose) {
          onClose();
        }

        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          
          setTimeout(() => {
            if (this.documentId && this.userId && this.token) {
              this.connect(this.documentId, this.userId, this.token, onMessage, onError, onClose);
            }
          }, delay);
        }
      };
    } catch (error) {
      if (onError) {
        onError(error as Event);
      }
    }
  }

  sendOperation(operation: WebSocketOperation): void {
    if (!this.ws) {
      return;
    }
    
    const state = this.ws.readyState;
    if (state === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(operation));
      } catch (error) {
      }
    } else {
      const stateNames = {
        [WebSocket.CONNECTING]: 'CONNECTING',
        [WebSocket.OPEN]: 'OPEN',
        [WebSocket.CLOSING]: 'CLOSING',
        [WebSocket.CLOSED]: 'CLOSED',
      };
      void stateNames;
    }
  }

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

  isConnected(): boolean {
    if (!this.ws) {
      return false;
    }
    return this.ws.readyState === WebSocket.OPEN;
  }

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

export const websocketService = new WebSocketService();
