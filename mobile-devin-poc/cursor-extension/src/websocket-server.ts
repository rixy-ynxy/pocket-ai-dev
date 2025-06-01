import WebSocket from 'ws';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileChangeEvent {
    type: 'file_changed' | 'file_created' | 'file_deleted';
    filePath: string;
    content?: string;
    timestamp: number;
    source: 'cursor' | 'mobile';
}

export interface WebSocketMessage {
    id: string;
    type: 'file_update' | 'file_request' | 'file_response' | 'file_change' | 'ping' | 'pong';
    payload: any;
    timestamp: number;
}

export class WebSocketBridge {
    private server: WebSocket.Server | undefined;
    private clients: Set<WebSocket.WebSocket> = new Set();
    private isServerRunning = false;
    private connectionChangeCallback: ((clientCount: number) => void) | undefined;

    constructor(private port: number) {}

    async start(): Promise<void> {
        if (this.isServerRunning) {
            throw new Error('WebSocket server is already running');
        }

        return new Promise((resolve, reject) => {
            this.server = new WebSocket.Server({ port: this.port }, () => {
                this.isServerRunning = true;
                console.log(`Mobile Devin WebSocket server started on port ${this.port}`);
                resolve();
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                reject(error);
            });

            this.server.on('connection', (ws, request) => {
                this.handleNewConnection(ws, request);
            });
        });
    }

    async stop(): Promise<void> {
        if (!this.isServerRunning || !this.server) {
            return;
        }

        return new Promise((resolve) => {
                    this.clients.forEach(client => {
            if (client.readyState === WebSocket.WebSocket.OPEN) {
                    client.close();
                }
            });
            
            this.clients.clear();
            
            this.server!.close(() => {
                this.isServerRunning = false;
                console.log('Mobile Devin WebSocket server stopped');
                resolve();
            });
        });
    }

    isRunning(): boolean {
        return this.isServerRunning;
    }

    getConnectedClients(): number {
        return this.clients.size;
    }

    onConnectionChange(callback: (clientCount: number) => void): void {
        this.connectionChangeCallback = callback;
    }

    broadcastFileChange(change: FileChangeEvent): void {
        const message: WebSocketMessage = {
            id: uuidv4(),
            type: 'file_change',
            payload: change,
            timestamp: Date.now()
        };

        this.broadcast(message);
    }

    private handleNewConnection(ws: WebSocket.WebSocket, request: any): void {
        console.log('New mobile client connected:', request.socket.remoteAddress);
        
        this.clients.add(ws);
        this.notifyConnectionChange();

        // Send welcome message
        this.sendMessage(ws, {
            id: uuidv4(),
            type: 'ping',
            payload: { message: 'Welcome to Mobile Devin Bridge' },
            timestamp: Date.now()
        });

        ws.on('message', (data) => {
            this.handleMessage(ws, data);
        });

        ws.on('close', () => {
            console.log('Mobile client disconnected');
            this.clients.delete(ws);
            this.notifyConnectionChange();
        });

        ws.on('error', (error) => {
            console.error('WebSocket client error:', error);
            this.clients.delete(ws);
            this.notifyConnectionChange();
        });
    }

    private handleMessage(ws: WebSocket.WebSocket, data: WebSocket.Data): void {
        try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'file_request':
                    this.handleFileRequest(ws, message);
                    break;
                case 'file_update':
                    this.handleFileUpdate(ws, message);
                    break;
                case 'ping':
                    this.handlePing(ws, message);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    private async handleFileRequest(ws: WebSocket.WebSocket, message: WebSocketMessage): Promise<void> {
        const { filePath } = message.payload;
        
        try {
            if (!vscode.workspace.workspaceFolders) {
                throw new Error('No workspace open');
            }

            const fullPath = this.resolveWorkspacePath(filePath);
            const content = await fs.promises.readFile(fullPath, 'utf8');
            
            this.sendMessage(ws, {
                id: uuidv4(),
                type: 'file_response',
                payload: {
                    filePath,
                    content,
                    exists: true
                },
                timestamp: Date.now()
            });

        } catch (error) {
            this.sendMessage(ws, {
                id: uuidv4(),
                type: 'file_response',
                payload: {
                    filePath,
                    content: null,
                    exists: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                timestamp: Date.now()
            });
        }
    }

    private async handleFileUpdate(ws: WebSocket.WebSocket, message: WebSocketMessage): Promise<void> {
        const { filePath, content } = message.payload;
        
        try {
            if (!vscode.workspace.workspaceFolders) {
                throw new Error('No workspace open');
            }

            const fullPath = this.resolveWorkspacePath(filePath);
            
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.promises.mkdir(dir, { recursive: true });
            
            // Write file
            await fs.promises.writeFile(fullPath, content, 'utf8');
            
            // Broadcast change to other clients
            const fileChange: FileChangeEvent = {
                type: 'file_changed',
                filePath,
                content,
                timestamp: Date.now(),
                source: 'mobile'
            };
            
            this.broadcastToOthers(ws, {
                id: uuidv4(),
                type: 'file_change',
                payload: fileChange,
                timestamp: Date.now()
            });

            console.log(`File updated from mobile: ${filePath}`);

        } catch (error) {
            console.error('Error updating file:', error);
        }
    }

    private handlePing(ws: WebSocket.WebSocket, message: WebSocketMessage): void {
        this.sendMessage(ws, {
            id: uuidv4(),
            type: 'pong',
            payload: { receivedId: message.id },
            timestamp: Date.now()
        });
    }

    private resolveWorkspacePath(relativePath: string): string {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('No workspace open');
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return path.resolve(workspaceRoot, relativePath);
    }

    private sendMessage(ws: WebSocket.WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === WebSocket.WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private broadcast(message: WebSocketMessage): void {
        this.clients.forEach(client => {
            this.sendMessage(client, message);
        });
    }

    private broadcastToOthers(sender: WebSocket.WebSocket, message: WebSocketMessage): void {
        this.clients.forEach(client => {
            if (client !== sender) {
                this.sendMessage(client, message);
            }
        });
    }

    private notifyConnectionChange(): void {
        if (this.connectionChangeCallback) {
            this.connectionChangeCallback(this.clients.size);
        }
    }
} 