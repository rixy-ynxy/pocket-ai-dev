import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  MobileDevinWebSocketClient,
  ConnectionState,
  FileChangeEvent,
  FileContent,
} from '../services/WebSocketClient';
import MonacoEditor from '../components/MonacoEditor';

interface FileItem {
  path: string;
  content?: string;
  exists: boolean;
  lastModified?: number;
}

interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'error' | 'success';
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const MainScreen: React.FC = () => {
  // WebSocket client
  const [wsClient] = useState(() => new MobileDevinWebSocketClient());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  
  // File management
  const [currentFile, setCurrentFile] = useState<FileItem | null>(null);
  const [projectFiles, setProjectFiles] = useState<FileItem[]>([]);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'editor' | 'files' | 'logs'>('editor');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isFileModalVisible, setIsFileModalVisible] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  
  // Initialize WebSocket client
  useEffect(() => {
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
      addLog(`Connection state: ${state}`, state === ConnectionState.CONNECTED ? 'success' : 'info');
    };

    const handleFileChange = (event: FileChangeEvent) => {
      addLog(`File ${event.type}: ${event.filePath}`, 'info');
      
      // Update current file if it matches
      if (currentFile && currentFile.path === event.filePath) {
        if (event.content !== undefined) {
          setEditorContent(event.content);
        }
      }
      
      // Update project files list
      loadProjectFiles();
    };

    wsClient.on('connectionStateChanged', handleConnectionStateChange);
    wsClient.on('fileChange', handleFileChange);

    return () => {
      wsClient.off('connectionStateChanged', handleConnectionStateChange);
      wsClient.off('fileChange', handleFileChange);
      wsClient.disconnect();
    };
  }, [currentFile, wsClient]);

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: new Date(),
      type,
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
  }, []);

  const connectToServer = async () => {
    try {
      addLog('Connecting to Cursor bridge...', 'info');
      await wsClient.connect();
      addLog('Connected successfully!', 'success');
      loadProjectFiles();
    } catch (error) {
      addLog(`Connection failed: ${error}`, 'error');
      Alert.alert('Connection Error', `Failed to connect: ${error}`);
    }
  };

  const disconnectFromServer = () => {
    wsClient.disconnect();
    addLog('Disconnected from server', 'info');
    setProjectFiles([]);
    setCurrentFile(null);
  };

  const loadProjectFiles = async () => {
    try {
      addLog('Loading project files...', 'info');
      const projectInfo = await wsClient.requestProjectInfo();
      
      if (projectInfo.files) {
        const files: FileItem[] = projectInfo.files.map((filePath: string) => ({
          path: filePath,
          exists: true,
        }));
        setProjectFiles(files);
        addLog(`Loaded ${files.length} files`, 'success');
      }
    } catch (error) {
      addLog(`Failed to load project files: ${error}`, 'error');
    }
  };

  const openFile = async (filePath: string) => {
    try {
      addLog(`Opening file: ${filePath}`, 'info');
      const fileContent: FileContent = await wsClient.requestFile(filePath);
      
      if (fileContent.exists && fileContent.content !== undefined) {
        const fileItem: FileItem = {
          path: filePath,
          content: fileContent.content,
          exists: true,
          lastModified: fileContent.lastModified,
        };
        
        setCurrentFile(fileItem);
        setEditorContent(fileContent.content);
        setActiveTab('editor');
        addLog(`Opened: ${filePath}`, 'success');
      } else {
        Alert.alert('File Error', `File not found or unreadable: ${filePath}`);
        addLog(`File not found: ${filePath}`, 'error');
      }
    } catch (error) {
      addLog(`Failed to open file: ${error}`, 'error');
      Alert.alert('Error', `Failed to open file: ${error}`);
    }
  };

  const saveCurrentFile = async () => {
    if (!currentFile) {
      Alert.alert('No File', 'No file is currently open');
      return;
    }

    try {
      addLog(`Saving file: ${currentFile.path}`, 'info');
      await wsClient.updateFile(currentFile.path, editorContent);
      
      // Update local file state
      setCurrentFile(prev => prev ? {
        ...prev,
        content: editorContent,
        lastModified: Date.now(),
      } : null);
      
      addLog(`Saved: ${currentFile.path}`, 'success');
      Alert.alert('Success', 'File saved successfully');
    } catch (error) {
      addLog(`Failed to save file: ${error}`, 'error');
      Alert.alert('Save Error', `Failed to save file: ${error}`);
    }
  };

  const createNewFile = async () => {
    if (!newFilePath.trim()) {
      Alert.alert('Invalid Path', 'Please enter a valid file path');
      return;
    }

    try {
      addLog(`Creating new file: ${newFilePath}`, 'info');
      await wsClient.updateFile(newFilePath, '// New file\n');
      
      const newFile: FileItem = {
        path: newFilePath,
        content: '// New file\n',
        exists: true,
        lastModified: Date.now(),
      };
      
      setProjectFiles(prev => [...prev, newFile]);
      setCurrentFile(newFile);
      setEditorContent('// New file\n');
      setNewFilePath('');
      setIsFileModalVisible(false);
      setActiveTab('editor');
      
      addLog(`Created: ${newFilePath}`, 'success');
    } catch (error) {
      addLog(`Failed to create file: ${error}`, 'error');
      Alert.alert('Create Error', `Failed to create file: ${error}`);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED: return '#4CAF50';
      case ConnectionState.CONNECTING: return '#FF9800';
      case ConnectionState.ERROR: return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'editor':
        return (
          <View style={styles.editorContainer}>
            {currentFile ? (
              <>
                <View style={styles.fileHeader}>
                  <Text style={styles.fileName}>{currentFile.path}</Text>
                  <TouchableOpacity style={styles.saveButton} onPress={saveCurrentFile}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
                <MonacoEditor
                  value={editorContent}
                  language={getLanguageFromPath(currentFile.path)}
                  theme="vs-dark"
                  onChange={setEditorContent}
                  onReady={() => setIsEditorReady(true)}
                  height={screenHeight - 200}
                />
              </>
            ) : (
              <View style={styles.noFileContainer}>
                <Text style={styles.noFileText}>No file selected</Text>
                <Text style={styles.noFileSubtext}>Open a file from the Files tab</Text>
              </View>
            )}
          </View>
        );

      case 'files':
        return (
          <View style={styles.filesContainer}>
            <View style={styles.filesHeader}>
              <Text style={styles.sectionTitle}>Project Files</Text>
              <View style={styles.fileActions}>
                <TouchableOpacity style={styles.actionButton} onPress={loadProjectFiles}>
                  <Text style={styles.actionButtonText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setIsFileModalVisible(true)}>
                  <Text style={styles.actionButtonText}>New</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={projectFiles}
              keyExtractor={(item) => item.path}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.fileItem,
                    currentFile?.path === item.path && styles.fileItemActive
                  ]}
                  onPress={() => openFile(item.path)}
                >
                  <Text style={styles.filePath}>{item.path}</Text>
                  {item.lastModified && (
                    <Text style={styles.fileDate}>
                      {new Date(item.lastModified).toLocaleTimeString()}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.filesList}
            />
          </View>
        );

      case 'logs':
        return (
          <View style={styles.logsContainer}>
            <View style={styles.logsHeader}>
              <Text style={styles.sectionTitle}>Activity Log</Text>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => setLogs([])}
              >
                <Text style={styles.actionButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={logs}
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <View style={styles.logItem}>
                  <View style={[styles.logDot, {backgroundColor: getLogColor(item.type)}]} />
                  <View style={styles.logContent}>
                    <Text style={styles.logMessage}>{item.message}</Text>
                    <Text style={styles.logTime}>
                      {item.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              )}
              style={styles.logsList}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#2196F3';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Mobile Devin POC</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, {backgroundColor: getConnectionStatusColor()}]} />
          <Text style={styles.statusText}>{connectionState}</Text>
        </View>
      </View>

      {/* Connection Controls */}
      <View style={styles.connectionControls}>
        {connectionState === ConnectionState.DISCONNECTED ? (
          <TouchableOpacity style={styles.connectButton} onPress={connectToServer}>
            <Text style={styles.connectButtonText}>Connect to Cursor</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnectFromServer}>
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['editor', 'files', 'logs'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* New File Modal */}
      <Modal
        visible={isFileModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New File</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter file path (e.g., src/components/NewComponent.tsx)"
              placeholderTextColor="#666"
              value={newFilePath}
              onChangeText={setNewFilePath}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setIsFileModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={createNewFile}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#ccc',
    fontSize: 12,
  },
  connectionControls: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    color: '#ccc',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  // Editor styles
  editorContainer: {
    flex: 1,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noFileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noFileText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  noFileSubtext: {
    color: '#ccc',
    fontSize: 14,
  },
  // Files styles
  filesContainer: {
    flex: 1,
    padding: 16,
  },
  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  fileItemActive: {
    backgroundColor: '#1565C0',
  },
  filePath: {
    color: '#fff',
    fontSize: 14,
  },
  fileDate: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  // Logs styles
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  logTime: {
    color: '#ccc',
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  modalButtonPrimary: {
    backgroundColor: '#2196F3',
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  modalButtonTextPrimary: {
    fontWeight: 'bold',
  },
});

export default MainScreen; 