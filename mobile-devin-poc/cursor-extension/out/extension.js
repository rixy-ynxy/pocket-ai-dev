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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const websocket_server_1 = require("./websocket-server");
const file_watcher_1 = require("./file-watcher");
let webSocketBridge;
let fileWatcher;
let statusBarItem;
function activate(context) {
    console.log('Mobile Devin Extension is now active!');
    // Status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'mobileDevin.showStatus';
    statusBarItem.text = '$(device-mobile) Mobile Devin: Disconnected';
    statusBarItem.show();
    // Register commands
    const startBridgeCommand = vscode.commands.registerCommand('mobileDevin.startBridge', async () => {
        await startMobileDevinBridge();
    });
    const stopBridgeCommand = vscode.commands.registerCommand('mobileDevin.stopBridge', async () => {
        await stopMobileDevinBridge();
    });
    const showStatusCommand = vscode.commands.registerCommand('mobileDevin.showStatus', () => {
        const status = webSocketBridge?.isRunning() ? 'Running' : 'Stopped';
        const connectedClients = webSocketBridge?.getConnectedClients() || 0;
        vscode.window.showInformationMessage(`Mobile Devin Bridge Status: ${status}\nConnected Clients: ${connectedClients}`);
    });
    context.subscriptions.push(startBridgeCommand, stopBridgeCommand, showStatusCommand, statusBarItem);
    // Auto-start if enabled
    const config = vscode.workspace.getConfiguration('mobileDevin');
    if (config.get('autoStart', true)) {
        startMobileDevinBridge();
    }
}
async function startMobileDevinBridge() {
    try {
        if (webSocketBridge?.isRunning()) {
            vscode.window.showWarningMessage('Mobile Devin Bridge is already running');
            return;
        }
        const config = vscode.workspace.getConfiguration('mobileDevin');
        const port = config.get('websocketPort', 3001);
        const enableFileWatcher = config.get('enableFileWatcher', true);
        // Start WebSocket Bridge
        webSocketBridge = new websocket_server_1.WebSocketBridge(port);
        await webSocketBridge.start();
        // Start File Watcher if enabled
        if (enableFileWatcher && vscode.workspace.workspaceFolders) {
            fileWatcher = new file_watcher_1.FileWatcher(vscode.workspace.workspaceFolders);
            fileWatcher.onFileChanged((change) => {
                webSocketBridge?.broadcastFileChange(change);
            });
            await fileWatcher.start();
        }
        // Update status
        updateStatusBar('Connected', webSocketBridge.getConnectedClients());
        vscode.window.showInformationMessage(`Mobile Devin Bridge started on port ${port}`);
        // Listen for connection changes
        webSocketBridge.onConnectionChange((clientCount) => {
            updateStatusBar('Connected', clientCount);
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to start Mobile Devin Bridge: ${error}`);
        updateStatusBar('Error', 0);
    }
}
async function stopMobileDevinBridge() {
    try {
        await webSocketBridge?.stop();
        await fileWatcher?.stop();
        webSocketBridge = undefined;
        fileWatcher = undefined;
        updateStatusBar('Disconnected', 0);
        vscode.window.showInformationMessage('Mobile Devin Bridge stopped');
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to stop Mobile Devin Bridge: ${error}`);
    }
}
function updateStatusBar(status, clientCount) {
    let icon = '$(device-mobile)';
    let color = undefined;
    switch (status) {
        case 'Connected':
            icon = '$(broadcast)';
            color = clientCount > 0 ? new vscode.ThemeColor('statusBarItem.prominentBackground') : undefined;
            break;
        case 'Error':
            icon = '$(error)';
            color = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
    }
    statusBarItem.text = `${icon} Mobile Devin: ${status}${clientCount > 0 ? ` (${clientCount})` : ''}`;
    statusBarItem.backgroundColor = color;
}
function deactivate() {
    return stopMobileDevinBridge();
}
//# sourceMappingURL=extension.js.map