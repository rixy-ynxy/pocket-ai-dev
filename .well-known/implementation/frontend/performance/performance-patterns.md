# パフォーマンスパターン (Performance Patterns)

## 概要

高性能アプリケーションの設計と実装のための実証済みパターンを定義します。レスポンス時間の最適化、スループットの向上、リソース効率の改善を実現するアーキテクチャパターンとベストプラクティスを提供します。

## 基本パフォーマンスパターン

### 1. キャッシングパターン

#### **メモリキャッシュ**
```python
import redis
from functools import wraps
import json
import hashlib

class CacheManager:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        self.default_ttl = 3600  # 1時間
    
    def cache_key(self, func_name: str, *args, **kwargs) -> str:
        """引数からキャッシュキーを生成"""
        key_data = f"{func_name}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str):
        """キャッシュから値を取得"""
        cached_value = self.redis_client.get(key)
        if cached_value:
            return json.loads(cached_value)
        return None
    
    def set(self, key: str, value, ttl: int = None):
        """キャッシュに値を設定"""
        ttl = ttl or self.default_ttl
        self.redis_client.setex(key, ttl, json.dumps(value, default=str))

cache_manager = CacheManager()

def cached(ttl: int = 3600):
    """デコレーターベースのキャッシング"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # キャッシュキー生成
            cache_key = cache_manager.cache_key(func.__name__, *args, **kwargs)
            
            # キャッシュから取得試行
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 関数実行
            result = func(*args, **kwargs)
            
            # 結果をキャッシュ
            cache_manager.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator

# 使用例
@cached(ttl=1800)  # 30分間キャッシュ
def get_user_profile(user_id: int):
    # 重い処理（DB查询、API呼び出しなど）
    return database.query(f"SELECT * FROM users WHERE id = {user_id}")
```

#### **CDN活用パターン**
```typescript
// フロントエンド静的リソース最適化
class CDNOptimizer {
    private cdnConfig = {
        images: 'https://cdn.example.com/images/',
        scripts: 'https://cdn.example.com/js/',
        styles: 'https://cdn.example.com/css/',
        fonts: 'https://cdn.example.com/fonts/'
    };
    
    // 画像の遅延読み込み
    lazyLoadImages() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    img.src = img.dataset.src!;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // 次世代画像フォーマット対応
    modernImageFormat(imagePath: string): string {
        const hasWebPSupport = document.createElement('canvas')
            .toDataURL('image/webp').indexOf('data:image/webp') === 0;
        
        if (hasWebPSupport) {
            return imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        return imagePath;
    }
}
```

### 2. データベース最適化パターン

#### **接続プール管理**
```python
import asyncpg
import asyncio
from contextlib import asynccontextmanager

class DatabasePool:
    def __init__(self, database_url: str, min_size: int = 10, max_size: int = 20):
        self.database_url = database_url
        self.min_size = min_size
        self.max_size = max_size
        self.pool = None
    
    async def create_pool(self):
        """接続プール作成"""
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=self.min_size,
            max_size=self.max_size,
            max_queries=50000,
            max_inactive_connection_lifetime=300.0,
            command_timeout=60
        )
    
    @asynccontextmanager
    async def acquire_connection(self):
        """接続の取得と自動返却"""
        async with self.pool.acquire() as connection:
            yield connection
    
    async def execute_query(self, query: str, *args):
        """クエリ実行"""
        async with self.acquire_connection() as conn:
            return await conn.fetch(query, *args)
    
    async def execute_transaction(self, queries: list):
        """トランザクション実行"""
        async with self.acquire_connection() as conn:
            async with conn.transaction():
                results = []
                for query, args in queries:
                    result = await conn.fetch(query, *args)
                    results.append(result)
                return results

# 使用例
db_pool = DatabasePool("postgresql://user:pass@localhost/db")

# インデックス最適化
async def optimize_database():
    """データベース最適化クエリ"""
    optimization_queries = [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id ON posts(user_id)",
        "ANALYZE users",
        "ANALYZE posts"
    ]
    
    for query in optimization_queries:
        await db_pool.execute_query(query)
```

#### **クエリ最適化**
```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class QueryOptimizer:
    def __init__(self):
        self.query_cache = {}
    
    def build_select_query(self, 
                          table: str, 
                          fields: List[str] = None, 
                          where_conditions: dict = None,
                          joins: List[dict] = None,
                          order_by: str = None,
                          limit: int = None,
                          offset: int = None) -> tuple:
        """最適化されたSELECTクエリの構築"""
        
        # フィールド選択の最適化
        if fields:
            select_clause = ", ".join(fields)
        else:
            select_clause = "*"
        
        query = f"SELECT {select_clause} FROM {table}"
        params = []
        param_count = 1
        
        # JOIN句の追加
        if joins:
            for join in joins:
                query += f" {join['type']} JOIN {join['table']} ON {join['condition']}"
        
        # WHERE句の追加
        if where_conditions:
            where_parts = []
            for field, value in where_conditions.items():
                if isinstance(value, list):
                    # IN句の最適化
                    placeholders = ", ".join([f"${param_count + i}" for i in range(len(value))])
                    where_parts.append(f"{field} IN ({placeholders})")
                    params.extend(value)
                    param_count += len(value)
                else:
                    where_parts.append(f"{field} = ${param_count}")
                    params.append(value)
                    param_count += 1
            
            query += " WHERE " + " AND ".join(where_parts)
        
        # ORDER BY句の追加
        if order_by:
            query += f" ORDER BY {order_by}"
        
        # LIMIT/OFFSET句の追加
        if limit:
            query += f" LIMIT {limit}"
            if offset:
                query += f" OFFSET {offset}"
        
        return query, params

# 使用例
optimizer = QueryOptimizer()

async def get_user_posts(user_id: int, page: int = 1, per_page: int = 10):
    """ユーザーの投稿を効率的に取得"""
    offset = (page - 1) * per_page
    
    query, params = optimizer.build_select_query(
        table="posts",
        fields=["id", "title", "content", "created_at"],
        where_conditions={"user_id": user_id, "status": "published"},
        order_by="created_at DESC",
        limit=per_page,
        offset=offset
    )
    
    return await db_pool.execute_query(query, *params)
```

### 3. 非同期処理パターン

#### **並行処理最適化**
```python
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
from typing import List, Any

class AsyncProcessor:
    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.semaphore = asyncio.Semaphore(max_workers)
    
    async def process_batch(self, items: List[Any], processor_func) -> List[Any]:
        """バッチ処理の並行実行"""
        async def bounded_process(item):
            async with self.semaphore:
                return await processor_func(item)
        
        tasks = [bounded_process(item) for item in items]
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def fetch_multiple_urls(self, urls: List[str]) -> List[dict]:
        """複数URLの並行取得"""
        async with aiohttp.ClientSession() as session:
            async def fetch_url(url):
                try:
                    async with session.get(url, timeout=10) as response:
                        return {
                            "url": url,
                            "status": response.status,
                            "data": await response.text(),
                            "error": None
                        }
                except Exception as e:
                    return {
                        "url": url,
                        "status": None,
                        "data": None,
                        "error": str(e)
                    }
            
            return await self.process_batch(urls, fetch_url)

# 使用例
processor = AsyncProcessor(max_workers=20)

async def aggregate_user_data(user_ids: List[int]):
    """複数ユーザーのデータを並行取得"""
    async def get_user_data(user_id):
        # 複数のデータソースから並行取得
        profile_task = get_user_profile(user_id)
        posts_task = get_user_posts(user_id, limit=5)
        followers_task = get_user_followers_count(user_id)
        
        profile, posts, followers = await asyncio.gather(
            profile_task, posts_task, followers_task
        )
        
        return {
            "user_id": user_id,
            "profile": profile,
            "recent_posts": posts,
            "followers_count": followers
        }
    
    return await processor.process_batch(user_ids, get_user_data)
```

## 高度パフォーマンスパターン

### 1. マイクロサービス最適化

#### **サーキットブレーカー付きHTTPクライアント**
```python
import asyncio
import aiohttp
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class PerformantHTTPClient:
    def __init__(self, base_url: str, circuit_breaker_config: dict = None):
        self.base_url = base_url
        self.circuit_state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        
        # サーキットブレーカー設定
        config = circuit_breaker_config or {}
        self.failure_threshold = config.get('failure_threshold', 5)
        self.recovery_timeout = config.get('recovery_timeout', 60)
        self.timeout = config.get('timeout', 10)
        
        # 接続プール設定
        connector = aiohttp.TCPConnector(
            limit=100,           # 総接続数制限
            limit_per_host=20,   # ホストあたり接続数制限
            ttl_dns_cache=300,   # DNS キャッシュ時間
            use_dns_cache=True,
            keepalive_timeout=30
        )
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
    
    async def request(self, method: str, endpoint: str, **kwargs) -> dict:
        """サーキットブレーカー付きリクエスト"""
        if self.circuit_state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.circuit_state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with self.session.request(method, url, **kwargs) as response:
                if response.status >= 500:
                    self._on_failure()
                    raise aiohttp.ClientResponseError(
                        response.request_info, response.history,
                        status=response.status
                    )
                
                self._on_success()
                return {
                    "status": response.status,
                    "data": await response.json(),
                    "headers": dict(response.headers)
                }
        
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        return (
            self.last_failure_time and
            datetime.now() - self.last_failure_time > timedelta(seconds=self.recovery_timeout)
        )
    
    def _on_success(self):
        self.failure_count = 0
        self.circuit_state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.circuit_state = CircuitState.OPEN
```

### 2. メッセージキュー最適化

#### **高性能メッセージ処理**
```python
import asyncio
import aiokafka
from typing import Callable, List
import json

class HighPerformanceMessageProcessor:
    def __init__(self, kafka_servers: List[str], consumer_group: str):
        self.kafka_servers = kafka_servers
        self.consumer_group = consumer_group
        self.consumer = None
        self.producer = None
        self.message_handlers = {}
        
    async def start(self):
        """Kafka クライアント初期化"""
        # コンシューマー設定（高性能向け）
        self.consumer = aiokafka.AIOKafkaConsumer(
            group_id=self.consumer_group,
            bootstrap_servers=self.kafka_servers,
            auto_offset_reset='earliest',
            max_poll_records=1000,        # バッチサイズ増加
            fetch_max_wait_ms=500,        # 最大待機時間
            fetch_min_bytes=1024,         # 最小フェッチサイズ
            enable_auto_commit=False,     # 手動コミット
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        
        # プロデューサー設定
        self.producer = aiokafka.AIOKafkaProducer(
            bootstrap_servers=self.kafka_servers,
            batch_size=32768,             # バッチサイズ32KB
            linger_ms=10,                 # バッチ待機時間
            compression_type='gzip',      # 圧縮有効化
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        
        await self.consumer.start()
        await self.producer.start()
    
    def register_handler(self, topic: str, handler: Callable):
        """メッセージハンドラー登録"""
        self.message_handlers[topic] = handler
    
    async def process_messages(self, topics: List[str], batch_size: int = 100):
        """高性能メッセージ処理"""
        self.consumer.subscribe(topics)
        
        while True:
            try:
                # バッチでメッセージ取得
                message_batch = await self.consumer.getmany(
                    timeout_ms=1000, max_records=batch_size
                )
                
                if not message_batch:
                    continue
                
                # 並行処理でメッセージ処理
                tasks = []
                for topic_partition, messages in message_batch.items():
                    topic = topic_partition.topic
                    if topic in self.message_handlers:
                        handler = self.message_handlers[topic]
                        
                        for message in messages:
                            task = asyncio.create_task(
                                self._process_single_message(handler, message)
                            )
                            tasks.append(task)
                
                # すべてのタスク完了を待機
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                    await self.consumer.commit()
                
            except Exception as e:
                print(f"Message processing error: {e}")
                await asyncio.sleep(1)
    
    async def _process_single_message(self, handler: Callable, message):
        """単一メッセージ処理"""
        try:
            await handler(message.value)
        except Exception as e:
            # エラーログ記録
            print(f"Handler error: {e}")
            # デッドレターキューに送信
            await self._send_to_dlq(message)
    
    async def _send_to_dlq(self, message):
        """デッドレターキューへの送信"""
        dlq_topic = f"{message.topic}.dlq"
        await self.producer.send(dlq_topic, message.value)

# 使用例
async def user_registration_handler(message_data):
    """ユーザー登録処理ハンドラー"""
    user_id = message_data['user_id']
    
    # 並行して複数のタスクを実行
    tasks = [
        send_welcome_email(user_id),
        create_user_profile(user_id),
        setup_default_preferences(user_id),
        track_registration_event(user_id)
    ]
    
    await asyncio.gather(*tasks)

processor = HighPerformanceMessageProcessor(
    kafka_servers=['kafka-1:9092', 'kafka-2:9092'],
    consumer_group='user-service'
)
processor.register_handler('user.registered', user_registration_handler)
```

## パフォーマンス監視パターン

### 1. リアルタイム性能測定

#### **カスタムメトリクス収集**
```python
import time
import asyncio
from contextlib import asynccontextmanager
from prometheus_client import Counter, Histogram, Gauge
from typing import Dict, Any

# Prometheusメトリクス定義
REQUEST_COUNT = Counter('http_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'Request duration')
ACTIVE_REQUESTS = Gauge('http_active_requests', 'Active requests')
DATABASE_CONNECTIONS = Gauge('database_connections_active', 'Active DB connections')
MEMORY_USAGE = Gauge('memory_usage_bytes', 'Memory usage in bytes')

class PerformanceMonitor:
    def __init__(self):
        self.active_requests = 0
        self.request_metrics = {}
        
    @asynccontextmanager
    async def measure_request(self, method: str, endpoint: str):
        """リクエスト性能測定コンテキストマネージャー"""
        start_time = time.time()
        self.active_requests += 1
        ACTIVE_REQUESTS.set(self.active_requests)
        
        try:
            yield
            status = 200
        except Exception as e:
            status = 500
            raise e
        finally:
            duration = time.time() - start_time
            self.active_requests -= 1
            
            # メトリクス記録
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
            REQUEST_DURATION.observe(duration)
            ACTIVE_REQUESTS.set(self.active_requests)
    
    async def collect_system_metrics(self):
        """システムメトリクス収集"""
        import psutil
        
        while True:
            # メモリ使用量
            memory = psutil.virtual_memory()
            MEMORY_USAGE.set(memory.used)
            
            # データベース接続数
            db_connections = await self._get_db_connection_count()
            DATABASE_CONNECTIONS.set(db_connections)
            
            await asyncio.sleep(10)  # 10秒間隔
    
    async def _get_db_connection_count(self) -> int:
        """アクティブなDB接続数を取得"""
        if hasattr(db_pool, 'pool') and db_pool.pool:
            return db_pool.pool.get_size() - db_pool.pool.get_idle_size()
        return 0

monitor = PerformanceMonitor()

# FastAPI統合例
from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    async with monitor.measure_request(request.method, request.url.path):
        response = await call_next(request)
        return response
```

### 2. 自動パフォーマンス最適化

#### **アダプティブ負荷制御**
```python
import asyncio
from dataclasses import dataclass
from typing import Optional
import statistics

@dataclass
class LoadControlConfig:
    target_latency_ms: float = 100.0
    max_concurrent_requests: int = 1000
    adjustment_interval: float = 10.0
    latency_window_size: int = 100

class AdaptiveLoadController:
    def __init__(self, config: LoadControlConfig):
        self.config = config
        self.current_limit = config.max_concurrent_requests // 2
        self.latency_measurements = []
        self.active_requests = 0
        self.semaphore = asyncio.Semaphore(self.current_limit)
        
    async def acquire_slot(self):
        """リクエストスロット取得"""
        await self.semaphore.acquire()
        self.active_requests += 1
    
    def release_slot(self, latency_ms: float):
        """リクエストスロット解放とレイテンシー記録"""
        self.active_requests -= 1
        self.semaphore.release()
        
        # レイテンシー測定値を記録
        self.latency_measurements.append(latency_ms)
        if len(self.latency_measurements) > self.config.latency_window_size:
            self.latency_measurements.pop(0)
    
    async def adaptive_control_loop(self):
        """適応的負荷制御ループ"""
        while True:
            await asyncio.sleep(self.config.adjustment_interval)
            
            if len(self.latency_measurements) < 10:
                continue
            
            # 現在のレイテンシー統計
            avg_latency = statistics.mean(self.latency_measurements)
            p95_latency = statistics.quantiles(self.latency_measurements, n=20)[18]
            
            # 制限値調整
            old_limit = self.current_limit
            
            if p95_latency > self.config.target_latency_ms * 1.5:
                # レイテンシーが高い場合は制限を厳しく
                self.current_limit = max(
                    self.current_limit * 0.8,
                    self.config.max_concurrent_requests * 0.1
                )
            elif avg_latency < self.config.target_latency_ms * 0.8:
                # レイテンシーが低い場合は制限を緩和
                self.current_limit = min(
                    self.current_limit * 1.1,
                    self.config.max_concurrent_requests
                )
            
            # セマフォ調整
            if self.current_limit != old_limit:
                self._adjust_semaphore(int(self.current_limit))
                print(f"Adjusted concurrent limit: {old_limit} -> {self.current_limit}")
    
    def _adjust_semaphore(self, new_limit: int):
        """セマフォ制限値調整"""
        current_value = self.semaphore._value
        if new_limit > current_value:
            # 制限緩和
            for _ in range(new_limit - current_value):
                self.semaphore.release()
        elif new_limit < current_value:
            # 制限強化
            for _ in range(current_value - new_limit):
                try:
                    self.semaphore.acquire_nowait()
                except:
                    break

# 使用例
load_controller = AdaptiveLoadController(LoadControlConfig())

@asynccontextmanager
async def managed_request():
    """管理されたリクエスト実行"""
    start_time = time.time()
    await load_controller.acquire_slot()
    
    try:
        yield
    finally:
        latency_ms = (time.time() - start_time) * 1000
        load_controller.release_slot(latency_ms)
```

## 実装ガイドライン

### 1. パフォーマンス目標設定

```yaml
# パフォーマンスSLI/SLO
performance_targets:
  response_time:
    p50: "< 200ms"
    p95: "< 500ms"
    p99: "< 1000ms"
  
  throughput:
    requests_per_second: "> 1000"
    concurrent_users: "> 500"
  
  resource_utilization:
    cpu_usage: "< 70%"
    memory_usage: "< 80%"
    database_connections: "< 80%"
```

### 2. パフォーマンステスト

```python
import asyncio
import aiohttp
import time
from dataclasses import dataclass
from typing import List

@dataclass
class LoadTestResult:
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    p95_response_time: float
    requests_per_second: float

class LoadTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        
    async def run_load_test(self, 
                           endpoint: str, 
                           concurrent_users: int, 
                           duration_seconds: int) -> LoadTestResult:
        """負荷テスト実行"""
        
        response_times = []
        successful_count = 0
        failed_count = 0
        
        async def user_session():
            async with aiohttp.ClientSession() as session:
                start_time = time.time()
                while time.time() - start_time < duration_seconds:
                    request_start = time.time()
                    try:
                        async with session.get(f"{self.base_url}{endpoint}") as response:
                            await response.text()
                            if response.status == 200:
                                nonlocal successful_count
                                successful_count += 1
                            else:
                                nonlocal failed_count
                                failed_count += 1
                    except:
                        failed_count += 1
                    
                    response_times.append((time.time() - request_start) * 1000)
                    await asyncio.sleep(0.1)  # 100ms間隔
        
        # 並行ユーザーセッション実行
        tasks = [user_session() for _ in range(concurrent_users)]
        await asyncio.gather(*tasks)
        
        # 結果計算
        total_requests = successful_count + failed_count
        avg_response_time = sum(response_times) / len(response_times)
        p95_response_time = sorted(response_times)[int(len(response_times) * 0.95)]
        rps = total_requests / duration_seconds
        
        return LoadTestResult(
            total_requests=total_requests,
            successful_requests=successful_count,
            failed_requests=failed_count,
            avg_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            requests_per_second=rps
        )

# 使用例
async def performance_test():
    tester = LoadTester("http://localhost:8000")
    result = await tester.run_load_test("/api/users", 50, 60)
    
    print(f"RPS: {result.requests_per_second:.1f}")
    print(f"Avg Response Time: {result.avg_response_time:.1f}ms")
    print(f"P95 Response Time: {result.p95_response_time:.1f}ms")
    print(f"Success Rate: {result.successful_requests/result.total_requests*100:.1f}%")
```

## まとめ

パフォーマンス最適化は継続的なプロセスです。本ドキュメントで紹介されたパターンを適切に組み合わせ、継続的な監視と改善を行うことで、高性能なアプリケーションを構築・維持できます。負荷テストとモニタリングを通じて、実際の運用環境での性能を継続的に向上させることが重要です。
