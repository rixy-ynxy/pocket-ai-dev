const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class MobileDevinTestClient {
    constructor(url = 'ws://localhost:3001') {
        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.pendingRequests = new Map();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                console.log('✅ Connected to Mobile Devin Bridge');
                this.isConnected = true;
                this.startHeartbeat();
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('close', () => {
                console.log('❌ Disconnected from Mobile Devin Bridge');
                this.isConnected = false;
            });

            this.ws.on('error', (error) => {
                console.error('💥 WebSocket error:', error);
                reject(error);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    async requestFile(filePath) {
        const messageId = uuidv4();
        const message = {
            id: messageId,
            type: 'file_request',
            payload: { filePath },
            timestamp: Date.now()
        };

        return this.sendMessageWithResponse(message);
    }

    async updateFile(filePath, content) {
        const messageId = uuidv4();
        const message = {
            id: messageId,
            type: 'file_update',
            payload: { filePath, content },
            timestamp: Date.now()
        };

        this.sendMessage(message);
        console.log(`📝 File update sent: ${filePath}`);
    }

    async requestProjectInfo() {
        const messageId = uuidv4();
        const message = {
            id: messageId,
            type: 'project_info_request',
            payload: {},
            timestamp: Date.now()
        };

        return this.sendMessageWithResponse(message);
    }

    onFileChange(callback) {
        this.messageHandlers.set('file_change', callback);
    }

    sendMessage(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('❌ Not connected to bridge');
        }
    }

    sendMessageWithResponse(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            // Store pending request
            this.pendingRequests.set(message.id, { resolve, reject });

            // Set timeout
            setTimeout(() => {
                if (this.pendingRequests.has(message.id)) {
                    this.pendingRequests.delete(message.id);
                    reject(new Error('Request timeout'));
                }
            }, timeout);

            // Send message
            this.sendMessage(message);
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            
            console.log(`📨 Received: ${message.type}`, {
                id: message.id,
                timestamp: new Date(message.timestamp).toISOString()
            });

            // Handle responses to pending requests
            if (message.type === 'file_response' || message.type === 'project_info_response') {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    this.pendingRequests.delete(message.id);
                    pending.resolve(message.payload);
                    return;
                }
            }

            // Handle pong
            if (message.type === 'pong') {
                console.log('💓 Heartbeat response received');
                return;
            }

            // Handle file changes
            if (message.type === 'file_change') {
                const handler = this.messageHandlers.get('file_change');
                if (handler) {
                    handler(message.payload);
                } else {
                    console.log(`📁 File change: ${message.payload.type} - ${message.payload.filePath}`);
                }
                return;
            }

            // Handle ping
            if (message.type === 'ping') {
                this.sendMessage({
                    id: uuidv4(),
                    type: 'pong',
                    payload: { receivedId: message.id },
                    timestamp: Date.now()
                });
                return;
            }

        } catch (error) {
            console.error('💥 Error parsing message:', error);
        }
    }

    startHeartbeat() {
        setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({
                    id: uuidv4(),
                    type: 'ping',
                    payload: { message: 'health check' },
                    timestamp: Date.now()
                });
            }
        }, 30000); // 30 seconds
    }
}

// Test runner
async function runTests() {
    const client = new MobileDevinTestClient();
    
    try {
        console.log('🚀 Starting Mobile Devin Bridge Test...\n');

        // Connect to bridge
        await client.connect();
        
        // Setup file change listener
        client.onFileChange((change) => {
            console.log(`🔄 File Change Event:`, change);
        });

        // Test 1: Request project info
        console.log('\n📋 Test 1: Request Project Info');
        try {
            const projectInfo = await client.requestProjectInfo();
            console.log('✅ Project Info:', projectInfo);
        } catch (error) {
            console.log('❌ Project Info failed:', error.message);
        }

        // Test 2: Request existing file
        console.log('\n📄 Test 2: Request File Content');
        try {
            const fileContent = await client.requestFile('package.json');
            console.log('✅ File content received:', fileContent.exists ? `${fileContent.content.length} chars` : 'File not found');
        } catch (error) {
            console.log('❌ File request failed:', error.message);
        }

        // Test 3: Create/Update a test file
        console.log('\n📝 Test 3: Update File');
        const testContent = `// Mobile Devin Test File
// Generated at: ${new Date().toISOString()}

export const testMessage = "Hello from Mobile Devin!";
export const timestamp = ${Date.now()};
`;
        
        await client.updateFile('mobile-devin-test.js', testContent);
        
        // Wait a bit for file system events
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 4: Verify the file was created
        console.log('\n🔍 Test 4: Verify Created File');
        try {
            const createdFile = await client.requestFile('mobile-devin-test.js');
            console.log('✅ Created file verified:', createdFile.exists ? 'Success' : 'Failed');
        } catch (error) {
            console.log('❌ File verification failed:', error.message);
        }

        console.log('\n🎉 All tests completed!');
        console.log('💡 Keep this running to see file change events...');
        console.log('📝 Try editing files in your VS Code workspace to see real-time updates.');

    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

// Export for use as module
module.exports = MobileDevinTestClient;

// Run tests if called directly
if (require.main === module) {
    runTests().catch(console.error);
} 