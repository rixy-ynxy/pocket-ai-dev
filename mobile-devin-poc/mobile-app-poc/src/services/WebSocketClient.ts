import {EventEmitter} from 'events';

export interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

export interface FileContent {
  filePath: string;
  content?: string;
  exists: boolean;
  lastModified?: number;
  error?: string;
}

export interface FileChangeEvent {
  type: 'file_changed' | 'file_created' | 'file_deleted';
  filePath: string;
  content?: string;
  timestamp: number;
  source: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export class MobileDevinWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private pendingRequests: Map<string, {resolve: Function; reject: Function}> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  private readonly serverUrl: string;
  private readonly heartbeatIntervalMs = 30000; // 30 seconds
  private readonly requestTimeoutMs = 10000; // 10 seconds

  constructor(serverUrl: string = 'ws://localhost:3001') {
    super();
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.setConnectionState(ConnectionState.CONNECTING);
        
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.setConnectionState(ConnectionState.CONNECTED);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
          this.setConnectionState(ConnectionState.DISCONNECTED);
          this.stopHeartbeat();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('💥 WebSocket error:', error);
          this.setConnectionState(ConnectionState.ERROR);
          reject(new Error('WebSocket connection failed'));
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionState !== ConnectionState.CONNECTED) {
            this.disconnect();
            reject(new Error('Connection timeout'));
          }
        }, this.requestTimeoutMs);

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.setConnectionState(ConnectionState.ERROR);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.reconnectAttempts = 0;
  }

  async requestFile(filePath: string): Promise<FileContent> {
    const response = await this.sendRequestMessage('file_request', {filePath});
    
    return {
      filePath: response.filePath || filePath,
      content: response.content,
      exists: response.exists || false,
      lastModified: response.lastModified,
      error: response.error,
    };
  }

  async updateFile(filePath: string, content: string): Promise<void> {
    await this.sendMessage('file_update', {filePath, content});
  }

  async requestProjectInfo(): Promise<any> {
    return await this.sendRequestMessage('project_info_request', {});
  }

  private async sendRequestMessage(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateId();
      const message: WebSocketMessage = {
        id: messageId,
        type,
        payload,
        timestamp: Date.now(),
      };

      // Store pending request
      this.pendingRequests.set(messageId, {resolve, reject});

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          reject(new Error('Request timeout'));
        }
      }, this.requestTimeoutMs);

      // Send message
      this.sendMessage(message);
    });
  }

  private sendMessage(typeOrMessage: string | WebSocketMessage, payload?: any): void {
    if (!this.ws || this.connectionState !== ConnectionState.CONNECTED) {
      throw new Error('WebSocket not connected');
    }

    let message: WebSocketMessage;
    
    if (typeof typeOrMessage === 'string') {
      message = {
        id: this.generateId(),
        type: typeOrMessage,
        payload: payload || {},
        timestamp: Date.now(),
      };
    } else {
      message = typeOrMessage;
    }

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`📤 Sent: ${message.type}`);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log(`📨 Received: ${message.type}`);

      switch (message.type) {
        case 'file_response':
        case 'project_info_response':
          this.handleResponse(message);
          break;
          
        case 'file_change':
          this.handleFileChange(message.payload);
          break;
          
        case 'ping':
          this.sendMessage('pong', {receivedId: message.id});
          break;
          
        case 'pong':
          console.log('💓 Heartbeat pong received');
          break;
          
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleResponse(message: WebSocketMessage): void {
    const pending = this.pendingRequests.get(message.id);
    if (pending) {
      this.pendingRequests.delete(message.id);
      pending.resolve(message.payload);
    }
  }

  private handleFileChange(payload: any): void {
    const fileChange: FileChangeEvent = {
      type: payload.type,
      filePath: payload.filePath,
      content: payload.content,
      timestamp: payload.timestamp || Date.now(),
      source: payload.source,
    };
    
    this.emit('fileChange', fileChange);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChanged', state);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        try {
          this.sendMessage('ping', {message: 'health check'});
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
} 