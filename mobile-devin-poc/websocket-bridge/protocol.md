# Mobile Devin WebSocket Protocol Specification

## 概要
Mobile DevinのデスクトップCursorとモバイルアプリ間のリアルタイム通信プロトコル定義

## メッセージフォーマット

### 基本構造
```json
{
  "id": "uuid-v4",
  "type": "message_type",
  "payload": { },
  "timestamp": 1234567890123
}
```

## メッセージタイプ

### 1. Connection & Health Check

#### PING
**送信**: Mobile → Desktop
```json
{
  "id": "uuid",
  "type": "ping",
  "payload": { "message": "health check" },
  "timestamp": 1234567890123
}
```

#### PONG
**送信**: Desktop → Mobile
```json
{
  "id": "uuid",
  "type": "pong",
  "payload": { "receivedId": "ping-uuid" },
  "timestamp": 1234567890123
}
```

### 2. File Operations

#### FILE_REQUEST
**送信**: Mobile → Desktop
**目的**: ファイル内容の取得要求
```json
{
  "id": "uuid",
  "type": "file_request",
  "payload": {
    "filePath": "src/components/App.tsx"
  },
  "timestamp": 1234567890123
}
```

#### FILE_RESPONSE
**送信**: Desktop → Mobile
**目的**: ファイル内容の応答
```json
{
  "id": "uuid",
  "type": "file_response",
  "payload": {
    "filePath": "src/components/App.tsx",
    "content": "import React from 'react'...",
    "exists": true,
    "lastModified": 1234567890123,
    "encoding": "utf8",
    "size": 1024
  },
  "timestamp": 1234567890123
}
```

**エラー時**:
```json
{
  "id": "uuid",
  "type": "file_response",
  "payload": {
    "filePath": "src/components/App.tsx",
    "content": null,
    "exists": false,
    "error": "File not found"
  },
  "timestamp": 1234567890123
}
```

#### FILE_UPDATE
**送信**: Mobile → Desktop
**目的**: ファイル内容の更新
```json
{
  "id": "uuid",
  "type": "file_update",
  "payload": {
    "filePath": "src/components/App.tsx",
    "content": "import React from 'react'...",
    "encoding": "utf8",
    "createDirectories": true
  },
  "timestamp": 1234567890123
}
```

#### FILE_CHANGE
**送信**: Desktop → Mobile (Broadcast)
**目的**: ファイル変更の通知
```json
{
  "id": "uuid",
  "type": "file_change",
  "payload": {
    "type": "file_changed|file_created|file_deleted",
    "filePath": "src/components/App.tsx",
    "content": "import React from 'react'...",
    "timestamp": 1234567890123,
    "source": "cursor|mobile"
  },
  "timestamp": 1234567890123
}
```

### 3. Project Operations

#### PROJECT_INFO_REQUEST
**送信**: Mobile → Desktop
```json
{
  "id": "uuid",
  "type": "project_info_request",
  "payload": {},
  "timestamp": 1234567890123
}
```

#### PROJECT_INFO_RESPONSE
**送信**: Desktop → Mobile
```json
{
  "id": "uuid",
  "type": "project_info_response",
  "payload": {
    "workspaceName": "my-react-app",
    "workspacePath": "/Users/dev/projects/my-react-app",
    "folders": [
      {
        "name": "src",
        "path": "src",
        "type": "directory"
      }
    ],
    "openFiles": [
      "src/App.tsx",
      "package.json"
    ]
  },
  "timestamp": 1234567890123
}
```

### 4. Error Handling

#### ERROR
**送信**: Desktop ↔ Mobile
```json
{
  "id": "uuid",
  "type": "error",
  "payload": {
    "code": "FILE_NOT_FOUND|PERMISSION_DENIED|INTERNAL_ERROR",
    "message": "Human readable error message",
    "details": {
      "originalRequestId": "uuid",
      "filePath": "src/components/App.tsx"
    }
  },
  "timestamp": 1234567890123
}
```

## 接続フロー

### 1. 初期接続
```
Mobile App  →  Desktop Cursor: WebSocket接続要求
Desktop     →  Mobile App:     接続確立
Desktop     →  Mobile App:     PING (Welcome message)
Mobile App  →  Desktop:        PONG
```

### 2. ファイル取得フロー
```
Mobile App  →  Desktop: FILE_REQUEST
Desktop     →  Mobile:  FILE_RESPONSE
```

### 3. ファイル更新フロー
```
Mobile App  →  Desktop: FILE_UPDATE
Desktop     →  Other Clients: FILE_CHANGE (broadcast)
```

### 4. ファイル監視フロー
```
File System →  Desktop: File change detected
Desktop     →  All Clients: FILE_CHANGE (broadcast)
```

## 接続管理

### 再接続戦略
- 接続断絶時: 指数バックオフ再接続 (1s, 2s, 4s, 8s, 最大30s)
- ハートビート: 30秒間隔でPING/PONG
- タイムアウト: 60秒でコネクション切断

### セキュリティ
- ローカルホスト接続のみ許可
- CORS制限なし（ローカル環境）
- 認証: なし（POC段階）

## エラーコード

| コード | 説明 |
|--------|------|
| `FILE_NOT_FOUND` | 指定されたファイルが存在しない |
| `PERMISSION_DENIED` | ファイルアクセス権限なし |
| `FILE_TOO_LARGE` | ファイルサイズが制限を超過 |
| `WORKSPACE_NOT_OPEN` | VS Codeでワークスペースが開かれていない |
| `INTERNAL_ERROR` | 内部システムエラー |
| `INVALID_MESSAGE` | メッセージフォーマット不正 |
| `CONNECTION_LOST` | 接続切断 |

## 制限事項

### ファイルサイズ制限
- 最大ファイルサイズ: 1MB
- バイナリファイル: 取り扱い不可
- 対応ファイル形式: テキストファイルのみ

### 同期制限
- 同時接続クライアント数: 10
- メッセージサイズ制限: 10MB
- ファイル監視深度: 50レベル

## 今後の拡張予定

### Phase 2機能
- バイナリファイル対応
- ファイル差分同期
- 競合解決メカニズム
- 認証・暗号化

### Phase 3機能  
- AI統合メッセージ
- リアルタイム共同編集
- プロジェクト設定同期
- 拡張機能連携 