"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketBridge = void 0;
const ws_1 = __importDefault(require("ws"));
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class WebSocketBridge {
    constructor(port) {
        this.port = port;
        this.clients = new Set();
        this.isServerRunning = false;
    }
    async start() {
        if (this.isServerRunning) {
            throw new Error('WebSocket server is already running');
        }
        return new Promise((resolve, reject) => {
            this.server = new ws_1.default.Server({ port: this.port }, () => {
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
    async stop() {
        if (!this.isServerRunning || !this.server) {
            return;
        }
        return new Promise((resolve) => {
            this.clients.forEach(client => {
                if (client.readyState === ws_1.default.WebSocket.OPEN) {
                    client.close();
                }
            });
            this.clients.clear();
            this.server.close(() => {
                this.isServerRunning = false;
                console.log('Mobile Devin WebSocket server stopped');
                resolve();
            });
        });
    }
    isRunning() {
        return this.isServerRunning;
    }
    getConnectedClients() {
        return this.clients.size;
    }
    onConnectionChange(callback) {
        this.connectionChangeCallback = callback;
    }
    broadcastFileChange(change) {
        const message = {
            id: (0, uuid_1.v4)(),
            type: 'file_change',
            payload: change,
            timestamp: Date.now()
        };
        this.broadcast(message);
    }
    handleNewConnection(ws, request) {
        console.log('New mobile client connected:', request.socket.remoteAddress);
        this.clients.add(ws);
        this.notifyConnectionChange();
        // Send welcome message
        this.sendMessage(ws, {
            id: (0, uuid_1.v4)(),
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
    handleMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
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
        }
        catch (error) {
            console.error('Error handling message:', error);
        }
    }
    async handleFileRequest(ws, message) {
        const { filePath } = message.payload;
        try {
            if (!vscode.workspace.workspaceFolders) {
                throw new Error('No workspace open');
            }
            const fullPath = this.resolveWorkspacePath(filePath);
            const content = await fs.promises.readFile(fullPath, 'utf8');
            this.sendMessage(ws, {
                id: (0, uuid_1.v4)(),
                type: 'file_response',
                payload: {
                    filePath,
                    content,
                    exists: true
                },
                timestamp: Date.now()
            });
        }
        catch (error) {
            this.sendMessage(ws, {
                id: (0, uuid_1.v4)(),
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
    async handleFileUpdate(ws, message) {
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
            const fileChange = {
                type: 'file_changed',
                filePath,
                content,
                timestamp: Date.now(),
                source: 'mobile'
            };
            this.broadcastToOthers(ws, {
                id: (0, uuid_1.v4)(),
                type: 'file_change',
                payload: fileChange,
                timestamp: Date.now()
            });
            console.log(`File updated from mobile: ${filePath}`);
        }
        catch (error) {
            console.error('Error updating file:', error);
        }
    }
    handlePing(ws, message) {
        this.sendMessage(ws, {
            id: (0, uuid_1.v4)(),
            type: 'pong',
            payload: { receivedId: message.id },
            timestamp: Date.now()
        });
    }
    resolveWorkspacePath(relativePath) {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('No workspace open');
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return path.resolve(workspaceRoot, relativePath);
    }
    sendMessage(ws, message) {
        if (ws.readyState === ws_1.default.WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    broadcast(message) {
        this.clients.forEach(client => {
            this.sendMessage(client, message);
        });
    }
    broadcastToOthers(sender, message) {
        this.clients.forEach(client => {
            if (client !== sender) {
                this.sendMessage(client, message);
            }
        });
    }
    notifyConnectionChange() {
        if (this.connectionChangeCallback) {
            this.connectionChangeCallback(this.clients.size);
        }
    }
}
exports.WebSocketBridge = WebSocketBridge;
//# sourceMappingURL=websocket-server.js.map