import * as vscode from 'vscode';
import { WebSocketBridge } from './websocket-server';
import { FileWatcher } from './file-watcher';

let webSocketBridge: WebSocketBridge | undefined;
let fileWatcher: FileWatcher | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
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
        
        vscode.window.showInformationMessage(
            `Mobile Devin Bridge Status: ${status}\nConnected Clients: ${connectedClients}`
        );
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
        webSocketBridge = new WebSocketBridge(port);
        await webSocketBridge.start();

        // Start File Watcher if enabled
        if (enableFileWatcher && vscode.workspace.workspaceFolders) {
            fileWatcher = new FileWatcher(vscode.workspace.workspaceFolders);
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

    } catch (error) {
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
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to stop Mobile Devin Bridge: ${error}`);
    }
}

function updateStatusBar(status: string, clientCount: number) {
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

export function deactivate() {
    return stopMobileDevinBridge();
} 