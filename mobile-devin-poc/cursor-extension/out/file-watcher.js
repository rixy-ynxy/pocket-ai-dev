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
exports.FileWatcher = void 0;
const chokidar = __importStar(require("chokidar"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileWatcher {
    constructor(workspaceFolders) {
        this.workspaceFolders = workspaceFolders;
        this.watchers = [];
        this.isWatching = false;
        this.ignorePatterns = [
            '**/node_modules/**',
            '**/.git/**',
            '**/.vscode/**',
            '**/out/**',
            '**/dist/**',
            '**/*.log',
            '**/tmp/**',
            '**/.DS_Store'
        ];
    }
    async start() {
        if (this.isWatching) {
            throw new Error('File watcher is already running');
        }
        for (const folder of this.workspaceFolders) {
            await this.watchWorkspaceFolder(folder);
        }
        this.isWatching = true;
        console.log(`File watcher started for ${this.workspaceFolders.length} workspace folders`);
    }
    async stop() {
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
    onFileChanged(callback) {
        this.changeCallback = callback;
    }
    async watchWorkspaceFolder(folder) {
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
    async handleFileChange(type, absolutePath, workspaceRoot) {
        try {
            // Convert absolute path to relative path
            const relativePath = path.relative(workspaceRoot, absolutePath);
            // Skip if path is outside workspace or matches ignore patterns
            if (relativePath.startsWith('..') || this.shouldIgnoreFile(relativePath)) {
                return;
            }
            let content;
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
                }
                catch (error) {
                    console.warn(`Could not read file: ${relativePath}`, error);
                    return;
                }
            }
            const changeEvent = {
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
        }
        catch (error) {
            console.error('Error handling file change:', error);
        }
    }
    shouldIgnoreFile(relativePath) {
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
    isTextFile(filePath) {
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
    isRunning() {
        return this.isWatching;
    }
    getWatchedPaths() {
        return this.workspaceFolders.map(folder => folder.uri.fsPath);
    }
}
exports.FileWatcher = FileWatcher;
//# sourceMappingURL=file-watcher.js.map