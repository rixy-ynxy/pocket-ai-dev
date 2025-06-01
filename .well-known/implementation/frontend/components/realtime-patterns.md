# リアルタイム通信パターン (Realtime Communication Patterns)

## 概要

リアルタイムアプリケーションにおける双方向通信とライブデータ更新の実証済みパターンを定義します。WebSocket、Server-Sent Events、リアルタイム状態管理を活用した高品質なユーザーエクスペリエンスの構築方法を提供します。

## 基本リアルタイム通信パターン

### 1. WebSocket 統合パターン

#### **WebSocket クライアント基盤**
```typescript
import { useEffect, useRef, useState, useCallback } from 'react'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
  id?: string
}

interface WebSocketHookConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onMessage?: (message: WebSocketMessage) => void
}

export function useWebSocket({
  url,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  heartbeatInterval = 30000,
  onConnect,
  onDisconnect,
  onError,
  onMessage
}: WebSocketHookConfig) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // メッセージ送信
  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      }
      wsRef.current.send(JSON.stringify(fullMessage))
      return true
    }
    return false
  }, [])

  // ハートビート機能
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current)
    }

    heartbeatTimeoutRef.current = setInterval(() => {
      sendMessage({ type: 'ping', data: {} })
    }, heartbeatInterval)
  }, [heartbeatInterval, sendMessage])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  // WebSocket接続
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // すでに接続済み
    }

    setConnectionState('connecting')

    try {
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setConnectionState('connected')
        setReconnectAttempts(0)
        startHeartbeat()
        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          // pongメッセージは内部処理のみ
          if (message.type === 'pong') {
            return
          }

          onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        setConnectionState('disconnected')
        stopHeartbeat()
        onDisconnect?.()

        // 自動再接続
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current.onerror = (error) => {
        setConnectionState('error')
        onError?.(error)
      }

    } catch (error) {
      setConnectionState('error')
      console.error('WebSocket connection failed:', error)
    }
  }, [url, reconnectAttempts, maxReconnectAttempts, reconnectInterval, startHeartbeat, stopHeartbeat, onConnect, onDisconnect, onError, onMessage])

  // 切断
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    stopHeartbeat()
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnectionState('disconnected')
    setReconnectAttempts(0)
  }, [stopHeartbeat])

  // 初期接続とクリーンアップ
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    connectionState,
    reconnectAttempts,
    sendMessage,
    connect,
    disconnect
  }
}
```

### 2. リアルタイムデータ管理パターン

#### **ライブ状態管理**
```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface LiveDataPoint {
  id: string
  timestamp: number
  value: any
  source: string
}

interface RealtimeState {
  // 接続状態
  isConnected: boolean
  lastHeartbeat: number
  connectionError: string | null

  // データストリーム
  dataStreams: Record<string, LiveDataPoint[]>
  subscriptions: Record<string, string[]> // streamId -> componentIds

  // アクションメソッド
  setConnectionState: (connected: boolean) => void
  setConnectionError: (error: string | null) => void
  updateHeartbeat: () => void
  
  addDataPoint: (streamId: string, dataPoint: LiveDataPoint) => void
  subscribe: (streamId: string, componentId: string) => void
  unsubscribe: (streamId: string, componentId: string) => void
  clearStream: (streamId: string) => void
  
  getLatestData: (streamId: string, limit?: number) => LiveDataPoint[]
  getStreamSubscribers: (streamId: string) => string[]
}

export const useRealtimeStore = create<RealtimeState>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    isConnected: false,
    lastHeartbeat: 0,
    connectionError: null,
    dataStreams: {},
    subscriptions: {},

    // 接続状態管理
    setConnectionState: (connected) => 
      set({ isConnected: connected, connectionError: connected ? null : get().connectionError }),

    setConnectionError: (error) => 
      set({ connectionError: error }),

    updateHeartbeat: () => 
      set({ lastHeartbeat: Date.now() }),

    // データストリーム管理
    addDataPoint: (streamId, dataPoint) => 
      set((state) => {
        const currentStream = state.dataStreams[streamId] || []
        const updatedStream = [...currentStream, dataPoint]
        
        // 最大1000ポイントまで保持（メモリ効率化）
        const limitedStream = updatedStream.slice(-1000)
        
        return {
          dataStreams: {
            ...state.dataStreams,
            [streamId]: limitedStream
          }
        }
      }),

    subscribe: (streamId, componentId) =>
      set((state) => {
        const currentSubs = state.subscriptions[streamId] || []
        if (currentSubs.includes(componentId)) {
          return state // すでに購読済み
        }
        
        return {
          subscriptions: {
            ...state.subscriptions,
            [streamId]: [...currentSubs, componentId]
          }
        }
      }),

    unsubscribe: (streamId, componentId) =>
      set((state) => {
        const currentSubs = state.subscriptions[streamId] || []
        const updatedSubs = currentSubs.filter(id => id !== componentId)
        
        if (updatedSubs.length === 0) {
          // 購読者がいなくなったらストリームを削除
          const { [streamId]: removed, ...remainingStreams } = state.dataStreams
          const { [streamId]: removedSub, ...remainingSubs } = state.subscriptions
          
          return {
            dataStreams: remainingStreams,
            subscriptions: remainingSubs
          }
        }
        
        return {
          subscriptions: {
            ...state.subscriptions,
            [streamId]: updatedSubs
          }
        }
      }),

    clearStream: (streamId) =>
      set((state) => {
        const { [streamId]: removed, ...remaining } = state.dataStreams
        const { [streamId]: removedSub, ...remainingSubs } = state.subscriptions
        
        return {
          dataStreams: remaining,
          subscriptions: remainingSubs
        }
      }),

    // データ取得
    getLatestData: (streamId, limit = 50) => {
      const stream = get().dataStreams[streamId] || []
      return stream.slice(-limit)
    },

    getStreamSubscribers: (streamId) => {
      return get().subscriptions[streamId] || []
    }
  }))
)

// リアルタイムデータ購読フック
export function useRealtimeData(streamId: string, componentId: string) {
  const {
    subscribe,
    unsubscribe,
    getLatestData,
    addDataPoint
  } = useRealtimeStore()

  const [data, setData] = useState<LiveDataPoint[]>([])

  useEffect(() => {
    // 購読開始
    subscribe(streamId, componentId)
    
    // 初期データ取得
    setData(getLatestData(streamId))

    // データ変更監視
    const unsubscribeStore = useRealtimeStore.subscribe(
      (state) => state.dataStreams[streamId],
      (stream) => {
        if (stream) {
          setData(stream.slice(-50)) // 最新50ポイント
        }
      }
    )

    return () => {
      unsubscribe(streamId, componentId)
      unsubscribeStore()
    }
  }, [streamId, componentId, subscribe, unsubscribe, getLatestData])

  return data
}
```

### 3. WebSocket統合アプリケーション

#### **リアルタイムダッシュボード**
```typescript
import { useEffect, useState } from 'react'

interface DashboardMetrics {
  activeUsers: number
  requestsPerMinute: number
  errorRate: number
  avgResponseTime: number
  systemLoad: number
  memoryUsage: number
}

export function RealtimeDashboard() {
  const componentId = 'dashboard-main'
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeUsers: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    avgResponseTime: 0,
    systemLoad: 0,
    memoryUsage: 0
  })

  // WebSocket接続
  const { connectionState, sendMessage } = useWebSocket({
    url: 'ws://localhost:8000/ws/dashboard',
    onConnect: () => {
      console.log('Dashboard connected to WebSocket')
      // ダッシュボードデータの購読開始
      sendMessage({
        type: 'subscribe',
        data: { streams: ['metrics', 'alerts', 'events'] }
      })
    },
    onMessage: (message) => {
      switch (message.type) {
        case 'metrics_update':
          setMetrics(message.data)
          break
        case 'alert':
          // アラート処理
          showNotification(message.data)
          break
        case 'system_event':
          // システムイベント処理
          logEvent(message.data)
          break
      }
    }
  })

  // リアルタイムチャートデータ
  const chartData = useRealtimeData('metrics', componentId)

  return (
    <div className="space-y-6">
      {/* 接続状態インジケーター */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">リアルタイムダッシュボード</h1>
        <ConnectionIndicator state={connectionState} />
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="アクティブユーザー"
          value={metrics.activeUsers}
          format="number"
          icon="👥"
          trend={calculateTrend(chartData, 'activeUsers')}
        />
        <MetricCard
          title="リクエスト/分"
          value={metrics.requestsPerMinute}
          format="number"
          icon="📈"
          trend={calculateTrend(chartData, 'requestsPerMinute')}
        />
        <MetricCard
          title="エラー率"
          value={metrics.errorRate}
          format="percentage"
          icon="⚠️"
          trend={calculateTrend(chartData, 'errorRate')}
        />
        <MetricCard
          title="平均応答時間"
          value={metrics.avgResponseTime}
          format="duration"
          icon="⏱️"
          trend={calculateTrend(chartData, 'avgResponseTime')}
        />
        <MetricCard
          title="システム負荷"
          value={metrics.systemLoad}
          format="percentage"
          icon="🖥️"
          trend={calculateTrend(chartData, 'systemLoad')}
        />
        <MetricCard
          title="メモリ使用量"
          value={metrics.memoryUsage}
          format="percentage"
          icon="💾"
          trend={calculateTrend(chartData, 'memoryUsage')}
        />
      </div>

      {/* リアルタイムチャート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimeChart
          title="アクティブユーザー数推移"
          dataKey="activeUsers"
          color="blue"
        />
        <RealtimeChart
          title="応答時間推移"
          dataKey="avgResponseTime"
          color="green"
        />
      </div>
    </div>
  )
}

// 接続状態インジケーター
function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const stateConfig = {
    connecting: { color: 'yellow', text: '接続中', icon: '🟡' },
    connected: { color: 'green', text: '接続済み', icon: '🟢' },
    disconnected: { color: 'red', text: '切断', icon: '🔴' },
    error: { color: 'red', text: 'エラー', icon: '❌' }
  }

  const config = stateConfig[state]

  return (
    <div className={`flex items-center space-x-2 text-${config.color}-600`}>
      <span>{config.icon}</span>
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  )
}

// メトリクスカード
interface MetricCardProps {
  title: string
  value: number
  format: 'number' | 'percentage' | 'duration'
  icon: string
  trend?: 'up' | 'down' | 'neutral'
}

function MetricCard({ title, value, format, icon, trend }: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`
      case 'duration':
        return `${val.toFixed(0)}ms`
      default:
        return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      default:
        return '➡️'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
      <div className="mt-4 flex items-center">
        <span className="text-sm text-gray-500">
          {getTrendIcon()} トレンド
        </span>
      </div>
    </div>
  )
}
```

## 高度リアルタイム通信パターン

### 1. チャットシステムパターン

#### **リアルタイムチャット実装**
```typescript
interface ChatMessage {
  id: string
  roomId: string
  userId: string
  username: string
  content: string
  timestamp: number
  type: 'text' | 'image' | 'file' | 'system'
  metadata?: Record<string, any>
}

interface ChatRoom {
  id: string
  name: string
  participants: string[]
  lastMessage?: ChatMessage
  unreadCount: number
}

interface TypingIndicator {
  userId: string
  username: string
  roomId: string
  timestamp: number
}

export function ChatApplication() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingIndicator[]>>({})
  const [newMessage, setNewMessage] = useState('')

  const currentUser = { id: 'user1', username: 'Current User' }

  // WebSocket接続
  const { connectionState, sendMessage } = useWebSocket({
    url: 'ws://localhost:8000/ws/chat',
    onConnect: () => {
      sendMessage({
        type: 'join_rooms',
        data: { userId: currentUser.id }
      })
    },
    onMessage: (message) => {
      switch (message.type) {
        case 'message':
          handleNewMessage(message.data)
          break
        case 'typing_start':
          handleTypingStart(message.data)
          break
        case 'typing_stop':
          handleTypingStop(message.data)
          break
        case 'user_joined':
          handleUserJoined(message.data)
          break
        case 'user_left':
          handleUserLeft(message.data)
          break
        case 'rooms_list':
          setRooms(message.data)
          break
      }
    }
  })

  // メッセージ送信
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !currentRoomId) return

    const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
      roomId: currentRoomId,
      userId: currentUser.id,
      username: currentUser.username,
      content: newMessage.trim(),
      type: 'text'
    }

    sendMessage({
      type: 'send_message',
      data: message
    })

    setNewMessage('')
    stopTyping()
  }, [newMessage, currentRoomId, sendMessage, currentUser])

  // タイピング状態管理
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const startTyping = useCallback(() => {
    if (!currentRoomId) return

    sendMessage({
      type: 'typing_start',
      data: {
        roomId: currentRoomId,
        userId: currentUser.id,
        username: currentUser.username
      }
    })

    // 3秒後に自動停止
    if (typingTimeout) clearTimeout(typingTimeout)
    const timeout = setTimeout(stopTyping, 3000)
    setTypingTimeout(timeout)
  }, [currentRoomId, sendMessage, currentUser, typingTimeout])

  const stopTyping = useCallback(() => {
    if (!currentRoomId) return

    sendMessage({
      type: 'typing_stop',
      data: {
        roomId: currentRoomId,
        userId: currentUser.id
      }
    })

    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }
  }, [currentRoomId, sendMessage, currentUser.id, typingTimeout])

  // メッセージハンドラー
  const handleNewMessage = (message: ChatMessage) => {
    setMessages(prev => ({
      ...prev,
      [message.roomId]: [...(prev[message.roomId] || []), message]
    }))

    // 既読状態更新（現在のルーム以外）
    if (message.roomId !== currentRoomId) {
      setRooms(prev => prev.map(room => 
        room.id === message.roomId
          ? { ...room, unreadCount: room.unreadCount + 1, lastMessage: message }
          : room
      ))
    }
  }

  const handleTypingStart = (indicator: TypingIndicator) => {
    if (indicator.userId === currentUser.id) return // 自分のタイピングは無視

    setTypingUsers(prev => ({
      ...prev,
      [indicator.roomId]: [
        ...(prev[indicator.roomId] || []).filter(t => t.userId !== indicator.userId),
        indicator
      ]
    }))
  }

  const handleTypingStop = (data: { roomId: string; userId: string }) => {
    setTypingUsers(prev => ({
      ...prev,
      [data.roomId]: (prev[data.roomId] || []).filter(t => t.userId !== data.userId)
    }))
  }

  const handleUserJoined = (data: { roomId: string; user: any }) => {
    // システムメッセージを追加
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      roomId: data.roomId,
      userId: 'system',
      username: 'システム',
      content: `${data.user.username}が参加しました`,
      timestamp: Date.now(),
      type: 'system'
    }
    handleNewMessage(systemMessage)
  }

  const handleUserLeft = (data: { roomId: string; user: any }) => {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      roomId: data.roomId,
      userId: 'system',
      username: 'システム',
      content: `${data.user.username}が退室しました`,
      timestamp: Date.now(),
      type: 'system'
    }
    handleNewMessage(systemMessage)
  }

  // ルーム選択
  const selectRoom = (roomId: string) => {
    setCurrentRoomId(roomId)
    
    // 未読カウントをリセット
    setRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, unreadCount: 0 } : room
    ))

    // ルーム参加通知
    sendMessage({
      type: 'join_room',
      data: { roomId, userId: currentUser.id }
    })
  }

  const currentRoomMessages = currentRoomId ? (messages[currentRoomId] || []) : []
  const currentRoomTyping = currentRoomId ? (typingUsers[currentRoomId] || []) : []

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ルーム一覧 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">チャットルーム</h2>
          <ConnectionIndicator state={connectionState} />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => selectRoom(room.id)}
              className={`
                p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50
                ${currentRoomId === room.id ? 'bg-blue-50 border-blue-200' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium">{room.name}</h3>
                  {room.lastMessage && (
                    <p className="text-sm text-gray-600 truncate">
                      {room.lastMessage.content}
                    </p>
                  )}
                </div>
                {room.unreadCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                    {room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* チャットエリア */}
      <div className="flex-1 flex flex-col">
        {currentRoomId ? (
          <>
            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentRoomMessages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.userId === currentUser.id}
                />
              ))}
              
              {/* タイピングインジケーター */}
              {currentRoomTyping.length > 0 && (
                <div className="text-sm text-gray-500">
                  {currentRoomTyping.map(t => t.username).join(', ')} が入力中...
                </div>
              )}
            </div>

            {/* メッセージ入力 */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    if (e.target.value && !typingTimeout) {
                      startTyping()
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage()
                    }
                  }}
                  placeholder="メッセージを入力..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  送信
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            チャットルームを選択してください
          </div>
        )}
      </div>
    </div>
  )
}

// メッセージバブル
function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (message.type === 'system') {
    return (
      <div className="text-center text-sm text-gray-500">
        {message.content}
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-xs lg:max-w-md px-4 py-2 rounded-lg
        ${isOwn 
          ? 'bg-blue-500 text-white' 
          : 'bg-white border border-gray-200'
        }
      `}>
        {!isOwn && (
          <div className="text-sm font-medium text-gray-900 mb-1">
            {message.username}
          </div>
        )}
        <div>{message.content}</div>
        <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}
```

### 2. ライブ通知システム

#### **リアルタイム通知管理**
```typescript
interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
  read: boolean
  actionUrl?: string
  actionLabel?: string
  autoRemove?: boolean
  duration?: number // ms
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 通知追加
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      read: false,
      autoRemove: notification.autoRemove ?? true,
      duration: notification.duration ?? 5000
    }

    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)

    // 自動削除
    if (newNotification.autoRemove) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, newNotification.duration)
    }

    return newNotification.id
  }, [])

  // 通知削除
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id)
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(n => n.id !== id)
    })
  }, [])

  // 既読にする
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id && !n.read 
        ? { ...n, read: true }
        : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // 全既読
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // 全削除
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  }
}

// 通知コンポーネント
export function NotificationSystem() {
  const { notifications, unreadCount, removeNotification, markAsRead } = useNotifications()

  // WebSocket通知受信
  useWebSocket({
    url: 'ws://localhost:8000/ws/notifications',
    onMessage: (message) => {
      if (message.type === 'notification') {
        addNotification(message.data)
      }
    }
  })

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications
        .filter(n => !n.read || !n.autoRemove)
        .slice(0, 5)
        .map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={() => removeNotification(notification.id)}
            onRead={() => markAsRead(notification.id)}
          />
        ))}
    </div>
  )
}

function NotificationItem({ 
  notification, 
  onRemove, 
  onRead 
}: { 
  notification: Notification
  onRemove: () => void
  onRead: () => void 
}) {
  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }

  useEffect(() => {
    if (!notification.read) {
      const timer = setTimeout(onRead, 3000) // 3秒後に自動既読
      return () => clearTimeout(timer)
    }
  }, [notification.read, onRead])

  return (
    <div className={`
      p-4 rounded-lg border shadow-sm animate-slide-in
      ${typeStyles[notification.type]}
      ${notification.read ? 'opacity-60' : ''}
    `}>
      <div className="flex items-start space-x-3">
        <span className="text-lg">{typeIcons[notification.type]}</span>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium">{notification.title}</h4>
          <p className="text-sm mt-1">{notification.message}</p>
          
          {notification.actionUrl && (
            <a
              href={notification.actionUrl}
              className="inline-block mt-2 text-sm font-medium underline hover:no-underline"
            >
              {notification.actionLabel || '詳細'}
            </a>
          )}
        </div>

        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
```

## パフォーマンス最適化パターン

### 1. 接続効率化

#### **接続プール管理**
```typescript
class WebSocketPool {
  private connections: Map<string, WebSocket> = new Map()
  private subscribers: Map<string, Set<string>> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000

  // 接続取得または作成
  getConnection(url: string, protocols?: string[]): WebSocket {
    if (this.connections.has(url)) {
      return this.connections.get(url)!
    }

    return this.createConnection(url, protocols)
  }

  // 新規接続作成
  private createConnection(url: string, protocols?: string[]): WebSocket {
    const ws = new WebSocket(url, protocols)
    
    ws.onopen = () => {
      this.reconnectAttempts.set(url, 0)
      console.log(`WebSocket connected: ${url}`)
    }

    ws.onclose = () => {
      this.connections.delete(url)
      this.attemptReconnect(url, protocols)
    }

    ws.onerror = (error) => {
      console.error(`WebSocket error on ${url}:`, error)
    }

    this.connections.set(url, ws)
    return ws
  }

  // 再接続試行
  private attemptReconnect(url: string, protocols?: string[]) {
    const attempts = this.reconnectAttempts.get(url) || 0
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(url, attempts + 1)
      
      setTimeout(() => {
        console.log(`Reconnecting to ${url} (attempt ${attempts + 1})`)
        this.createConnection(url, protocols)
      }, this.reconnectInterval * Math.pow(2, attempts)) // 指数バックオフ
    }
  }

  // 購読者登録
  subscribe(url: string, subscriberId: string) {
    if (!this.subscribers.has(url)) {
      this.subscribers.set(url, new Set())
    }
    this.subscribers.get(url)!.add(subscriberId)
  }

  // 購読解除
  unsubscribe(url: string, subscriberId: string) {
    const subs = this.subscribers.get(url)
    if (subs) {
      subs.delete(subscriberId)
      
      // 購読者がいなくなったら接続を閉じる
      if (subs.size === 0) {
        this.closeConnection(url)
      }
    }
  }

  // 接続終了
  private closeConnection(url: string) {
    const ws = this.connections.get(url)
    if (ws) {
      ws.close()
      this.connections.delete(url)
      this.subscribers.delete(url)
      this.reconnectAttempts.delete(url)
    }
  }

  // 全接続終了
  closeAll() {
    this.connections.forEach((ws, url) => {
      ws.close()
    })
    this.connections.clear()
    this.subscribers.clear()
    this.reconnectAttempts.clear()
  }
}

// シングルトンインスタンス
export const wsPool = new WebSocketPool()
```

### 2. データバッファリング

#### **効率的データ更新**
```typescript
class DataBuffer<T> {
  private buffer: T[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private subscribers: Set<(data: T[]) => void> = new Set()

  constructor(
    private flushInterval: number = 100, // 100ms
    private maxBufferSize: number = 100
  ) {}

  // データ追加
  add(data: T | T[]) {
    const items = Array.isArray(data) ? data : [data]
    this.buffer.push(...items)

    // バッファサイズ制限
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize)
    }

    // 定期フラッシュの設定
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush()
      }, this.flushInterval)
    }
  }

  // バッファをフラッシュ
  private flush() {
    if (this.buffer.length > 0) {
      const data = [...this.buffer]
      this.buffer = []
      
      this.subscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Buffer subscriber error:', error)
        }
      })
    }

    this.flushTimer = null
  }

  // 購読
  subscribe(callback: (data: T[]) => void) {
    this.subscribers.add(callback)
    
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // 即座にフラッシュ
  forceFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
  }

  // 破棄
  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
    }
    this.buffer = []
    this.subscribers.clear()
  }
}

// 使用例
export function useBufferedData<T>(
  bufferOptions?: { flushInterval?: number; maxBufferSize?: number }
) {
  const bufferRef = useRef<DataBuffer<T>>()
  const [data, setData] = useState<T[]>([])

  useEffect(() => {
    bufferRef.current = new DataBuffer<T>(
      bufferOptions?.flushInterval,
      bufferOptions?.maxBufferSize
    )

    const unsubscribe = bufferRef.current.subscribe((bufferedData) => {
      setData(prev => [...prev, ...bufferedData])
    })

    return () => {
      unsubscribe()
      bufferRef.current?.destroy()
    }
  }, [bufferOptions?.flushInterval, bufferOptions?.maxBufferSize])

  const addData = useCallback((newData: T | T[]) => {
    bufferRef.current?.add(newData)
  }, [])

  const clearData = useCallback(() => {
    setData([])
  }, [])

  return { data, addData, clearData }
}
```

## まとめ

リアルタイム通信パターンの適切な実装により、ユーザーにとって応答性が高く、インタラクティブなアプリケーションを構築できます。WebSocket、状態管理、バッファリングの組み合わせは、大規模なリアルタイムアプリケーションの開発を可能にします。チャットシステム、ライブダッシュボード、通知システムなど、様々なユースケースに対応した実証済みパターンを活用することで、高品質なリアルタイム機能を効率的に実装できます。 