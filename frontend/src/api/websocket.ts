type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
type MessageListener = (data: string) => void;
type StatusListener = (status: ConnectionStatus) => void;

/**
 * WebSocket client with auto-reconnection
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000; // 30 seconds
  private reconnectTimer: number | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    // Determine WebSocket protocol from current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.setStatus('connecting');

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.setStatus('connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    };

    this.ws.onmessage = (event) => {
      this.listeners.forEach((listener) => listener(event.data));
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      return; // Already scheduled
    }

    // Calculate delay: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to incoming messages
   * @returns Unsubscribe function
   */
  onMessage(callback: MessageListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to connection status changes
   * @returns Unsubscribe function
   */
  onStatusChange(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Send message to server
   */
  send(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Disconnect and stop reconnection attempts
   */
  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Update status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
