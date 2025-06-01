import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { FileChangeEvent } from './websocket-server';

export class FileWatcher {
    private watchers: chokidar.FSWatcher[] = [];
    private isWatching = false;
    private changeCallback: ((change: FileChangeEvent) => void) | undefined;
    private ignorePatterns: string[] = [
        '**/node_modules/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/out/**',
        '**/dist/**',
        '**/*.log',
        '**/tmp/**',
        '**/.DS_Store'
    ];

    constructor(private workspaceFolders: readonly vscode.WorkspaceFolder[]) {}

    async start(): Promise<void> {
        if (this.isWatching) {
            throw new Error('File watcher is already running');
        }

        for (const folder of this.workspaceFolders) {
            await this.watchWorkspaceFolder(folder);
        }

        this.isWatching = true;
        console.log(`File watcher started for ${this.workspaceFolders.length} workspace folders`);
    }

    async stop(): Promise<void> {
        if (!this.isWatching) {
            return;
        }

        for (const watcher of this.watchers) {
            await watcher.close();
        }

        this.watchers = [];
        this.isWatching = false;
        console.log('File watcher stopped');
    }

    onFileChanged(callback: (change: FileChangeEvent) => void): void {
        this.changeCallback = callback;
    }

    private async watchWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
        const folderPath = folder.uri.fsPath;
        
        const watcher = chokidar.watch(folderPath, {
            ignored: this.ignorePatterns,
            persistent: true,
            ignoreInitial: true,
            followSymlinks: false,
            depth: 50, // Reasonable depth limit
            usePolling: false, // Use native file system events
            interval: 100, // Polling interval if usePolling is true
            binaryInterval: 300
        });

        watcher.on('change', (filePath) => {
            this.handleFileChange('file_changed', filePath, folderPath);
        });

        watcher.on('add', (filePath) => {
            this.handleFileChange('file_created', filePath, folderPath);
        });

        watcher.on('unlink', (filePath) => {
            this.handleFileChange('file_deleted', filePath, folderPath);
        });

        watcher.on('error', (error) => {
            console.error('File watcher error:', error);
        });

        watcher.on('ready', () => {
            console.log(`File watcher ready for: ${folderPath}`);
        });

        this.watchers.push(watcher);
    }

    private async handleFileChange(
        type: 'file_changed' | 'file_created' | 'file_deleted',
        absolutePath: string,
        workspaceRoot: string
    ): Promise<void> {
        try {
            // Convert absolute path to relative path
            const relativePath = path.relative(workspaceRoot, absolutePath);
            
            // Skip if path is outside workspace or matches ignore patterns
            if (relativePath.startsWith('..') || this.shouldIgnoreFile(relativePath)) {
                return;
            }

            let content: string | undefined;
            
            // Read file content for created/changed files
            if (type !== 'file_deleted') {
                try {
                    // Check file size before reading (limit to 1MB)
                    const stats = await fs.promises.stat(absolutePath);
                    const maxFileSize = 1024 * 1024; // 1MB
                    
                    if (stats.size > maxFileSize) {
                        console.warn(`File too large, skipping: ${relativePath} (${stats.size} bytes)`);
                        return;
                    }
                    
                    // Only read text files
                    if (this.isTextFile(relativePath)) {
                        content = await fs.promises.readFile(absolutePath, 'utf8');
                    }
                } catch (error) {
                    console.warn(`Could not read file: ${relativePath}`, error);
                    return;
                }
            }

            const changeEvent: FileChangeEvent = {
                type,
                filePath: relativePath,
                content,
                timestamp: Date.now(),
                source: 'cursor'
            };

            if (this.changeCallback) {
                this.changeCallback(changeEvent);
            }

            console.log(`File ${type}: ${relativePath}`);

        } catch (error) {
            console.error('Error handling file change:', error);
        }
    }

    private shouldIgnoreFile(relativePath: string): boolean {
        // Check against ignore patterns
        for (const pattern of this.ignorePatterns) {
            const regexPattern = pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '[^/]');
            
            if (new RegExp(regexPattern).test(relativePath)) {
                return true;
            }
        }

        // Ignore temporary files and backups
        const fileName = path.basename(relativePath);
        if (fileName.startsWith('.') && fileName !== '.env') {
            return true;
        }

        if (fileName.endsWith('~') || fileName.endsWith('.tmp') || fileName.endsWith('.bak')) {
            return true;
        }

        return false;
    }

    private isTextFile(filePath: string): boolean {
        const textExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.scss', '.sass',
            '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go',
            '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.fish',
            '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
            '.md', '.txt', '.rst', '.tex', '.latex',
            '.vue', '.svelte', '.astro', '.sql', '.graphql', '.proto',
            '.dockerfile', '.gitignore', '.gitattributes',
            '.env', '.env.local', '.env.development', '.env.production'
        ];

        const ext = path.extname(filePath).toLowerCase();
        return textExtensions.includes(ext) || !ext; // Include files without extension
    }

    isRunning(): boolean {
        return this.isWatching;
    }

    getWatchedPaths(): string[] {
        return this.workspaceFolders.map(folder => folder.uri.fsPath);
    }
} 