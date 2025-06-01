import React, {useRef, useEffect, useState} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';

interface MonacoEditorProps {
  value?: string;
  language?: string;
  theme?: string;
  onChange?: (value: string) => void;
  onReady?: () => void;
  width?: number;
  height?: number;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value = '',
  language = 'javascript',
  theme = 'vs-dark',
  onChange,
  onReady,
  width,
  height,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const editorWidth = width || screenWidth;
  const editorHeight = height || screenHeight * 0.7;

  useEffect(() => {
    if (isReady && value !== currentValue) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'setValue',
        value,
      }));
      setCurrentValue(value);
    }
  }, [value, isReady, currentValue]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          setIsReady(true);
          onReady?.();
          break;
          
        case 'change':
          setCurrentValue(data.value);
          onChange?.(data.value);
          break;
          
        case 'error':
          console.error('Monaco Editor Error:', data.error);
          break;
          
        default:
          console.log('Monaco message:', data);
      }
    } catch (error) {
      console.error('Failed to parse Monaco message:', error);
    }
  };

  const monacoHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #1e1e1e;
        }
        
        #container {
            width: 100vw;
            height: 100vh;
        }
        
        .monaco-editor {
            background: #1e1e1e !important;
        }
        
        /* Mobile optimizations */
        .monaco-editor .margin {
            background: #1e1e1e !important;
        }
        
        .monaco-editor .minimap {
            display: none !important;
        }
        
        .monaco-editor .scroll-decoration {
            display: none !important;
        }
        
        /* Touch-friendly scrollbars */
        .monaco-scrollable-element > .scrollbar {
            width: 12px !important;
            height: 12px !important;
        }
        
        .monaco-scrollable-element > .scrollbar > .slider {
            background: rgba(121, 121, 121, 0.4) !important;
        }
    </style>
</head>
<body>
    <div id="container"></div>
    
    <script src="https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js"></script>
    <script>
        let editor = null;
        let isReady = false;
        
        require.config({ 
            paths: { 
                vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' 
            } 
        });
        
        require(['vs/editor/editor.main'], function () {
            try {
                // Monaco Editor configuration
                editor = monaco.editor.create(document.getElementById('container'), {
                    value: '${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
                    language: '${language}',
                    theme: '${theme}',
                    
                    // Mobile optimizations
                    automaticLayout: true,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineHeight: 20,
                    
                    // Touch-friendly settings
                    mouseWheelZoom: false,
                    cursorBlinking: 'blink',
                    cursorSmoothCaretAnimation: true,
                    smoothScrolling: true,
                    
                    // Disable features that don't work well on mobile
                    hover: { enabled: true, delay: 300 },
                    quickSuggestions: { other: true, comments: false, strings: false },
                    parameterHints: { enabled: true },
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    
                    // Mobile layout
                    folding: false,
                    lineNumbers: 'on',
                    glyphMargin: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 3,
                    
                    // Scrolling
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 12,
                        horizontalScrollbarSize: 12,
                        alwaysConsumeMouseWheel: false
                    }
                });

                // Handle content changes
                editor.onDidChangeModelContent(() => {
                    if (isReady) {
                        sendMessage({
                            type: 'change',
                            value: editor.getValue()
                        });
                    }
                });

                // Handle editor ready
                editor.onDidLayoutChange(() => {
                    if (!isReady) {
                        isReady = true;
                        sendMessage({ type: 'ready' });
                    }
                });

                // Message handler from React Native
                document.addEventListener('message', function(e) {
                    handleMessage(e.data);
                });
                
                window.addEventListener('message', function(e) {
                    handleMessage(e.data);
                });

            } catch (error) {
                sendMessage({
                    type: 'error',
                    error: error.message
                });
            }
        });

        function handleMessage(data) {
            try {
                const message = typeof data === 'string' ? JSON.parse(data) : data;
                
                switch (message.type) {
                    case 'setValue':
                        if (editor && message.value !== editor.getValue()) {
                            editor.setValue(message.value);
                        }
                        break;
                        
                    case 'setLanguage':
                        if (editor) {
                            monaco.editor.setModelLanguage(editor.getModel(), message.language);
                        }
                        break;
                        
                    case 'setTheme':
                        if (editor) {
                            monaco.editor.setTheme(message.theme);
                        }
                        break;
                        
                    case 'focus':
                        if (editor) {
                            editor.focus();
                        }
                        break;
                        
                    case 'resize':
                        if (editor) {
                            editor.layout();
                        }
                        break;
                }
            } catch (error) {
                sendMessage({
                    type: 'error',
                    error: 'Failed to handle message: ' + error.message
                });
            }
        }

        function sendMessage(message) {
            try {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
                }
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }

        // Handle resize events
        window.addEventListener('resize', () => {
            if (editor) {
                editor.layout();
            }
        });

        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    </script>
</body>
</html>`;

  return (
    <View style={[styles.container, {width: editorWidth, height: editorHeight}]}>
      <WebView
        ref={webViewRef}
        source={{html: monacoHTML}}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
});

export default MonacoEditor; 