# 可用性パターン (Availability Patterns)

## 概要

高可用性システムの設計と実装のための実証済みパターンを定義します。システムの中断を最小限に抑え、継続的なサービス提供を確保するためのアーキテクチャパターンとベストプラクティスを提供します。

## 基本可用性パターン

### 1. 冗長化パターン (Redundancy Patterns)

#### **アクティブ・パッシブ構成**
```yaml
# アクティブ・パッシブ構成例
availability:
  active_passive:
    primary:
      - server-01
      - health_check_endpoint: "/health"
      - failover_threshold: 3_failures
    
    secondary:
      - server-02
      - sync_mode: "real_time"
      - promotion_time: "< 30s"
```

#### **アクティブ・アクティブ構成**
```python
# ロードバランサー設定
class LoadBalancer:
    def __init__(self):
        self.active_nodes = [
            {"host": "app-01", "weight": 50, "health": "healthy"},
            {"host": "app-02", "weight": 50, "health": "healthy"},
            {"host": "app-03", "weight": 50, "health": "healthy"}
        ]
    
    def route_request(self, request):
        healthy_nodes = [node for node in self.active_nodes if node["health"] == "healthy"]
        return self.round_robin_select(healthy_nodes)
```

### 2. フェイルオーバーパターン

#### **自動フェイルオーバー**
```python
import asyncio
from typing import List, Optional

class AutoFailover:
    def __init__(self, primary_endpoint: str, secondary_endpoints: List[str]):
        self.primary = primary_endpoint
        self.secondaries = secondary_endpoints
        self.current_endpoint = primary_endpoint
        self.health_check_interval = 30  # 30秒間隔
    
    async def health_check(self, endpoint: str) -> bool:
        try:
            response = await self.http_client.get(f"{endpoint}/health", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    async def monitor_and_failover(self):
        while True:
            if not await self.health_check(self.current_endpoint):
                await self.perform_failover()
            await asyncio.sleep(self.health_check_interval)
    
    async def perform_failover(self):
        for secondary in self.secondaries:
            if await self.health_check(secondary):
                self.current_endpoint = secondary
                self.notify_failover(secondary)
                break
```

#### **手動フェイルオーバー**
```bash
# 手動フェイルオーバースクリプト
#!/bin/bash

CURRENT_PRIMARY="app-primary"
BACKUP_SERVERS=("app-backup-01" "app-backup-02")

failover_to_backup() {
    local backup_server=$1
    
    echo "Performing failover to $backup_server..."
    
    # トラフィック停止
    kubectl patch service app-service -p '{"spec":{"selector":{"app":"'$backup_server'"}}}'
    
    # プライマリー停止
    kubectl scale deployment $CURRENT_PRIMARY --replicas=0
    
    # バックアップ起動
    kubectl scale deployment $backup_server --replicas=3
    
    echo "Failover completed to $backup_server"
}
```

### 3. 回路ブレーカーパターン

#### **基本実装**
```python
import time
from enum import Enum
from typing import Callable, Any

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        return (
            self.last_failure_time and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

## 高度可用性パターン

### 1. マルチリージョン展開

#### **グローバル負荷分散**
```yaml
# Terraformでのマルチリージョン設定
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  
  set_identifier = "primary"
  health_check_id = aws_route53_health_check.primary.id
  
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app_failover" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  
  set_identifier = "secondary"
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  alias {
    name                   = aws_lb.secondary.dns_name
    zone_id                = aws_lb.secondary.zone_id
    evaluate_target_health = true
  }
}
```

#### **レプリケーション戦略**
```python
# データベースレプリケーション管理
class DatabaseReplication:
    def __init__(self):
        self.primary_db = "db-primary-us-east-1"
        self.replicas = {
            "us-west-2": "db-replica-us-west-2",
            "eu-west-1": "db-replica-eu-west-1",
            "ap-southeast-1": "db-replica-ap-southeast-1"
        }
    
    def write_operation(self, query: str, params: dict):
        # 書き込みは常にプライマリーに
        return self.execute_on_primary(query, params)
    
    def read_operation(self, query: str, params: dict, prefer_local: bool = True):
        if prefer_local:
            local_replica = self.get_nearest_replica()
            if self.is_replica_healthy(local_replica):
                return self.execute_on_replica(local_replica, query, params)
        
        # フォールバック: プライマリーから読み取り
        return self.execute_on_primary(query, params)
```

### 2. カナリアデプロイメント

#### **段階的リリース**
```yaml
# Kubernetesカナリアデプロイメント
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: app-rollout
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10    # 10%のトラフィックを新バージョンに
      - pause: {duration: 300s}  # 5分間監視
      - setWeight: 25    # 25%に増加
      - pause: {duration: 300s}
      - setWeight: 50    # 50%に増加
      - pause: {duration: 300s}
      - setWeight: 100   # 完全切り替え
      
      analysis:
        templates:
        - templateName: error-rate-analysis
        args:
        - name: service-name
          value: app-service
```

#### **自動ロールバック**
```python
class CanaryMonitor:
    def __init__(self):
        self.error_threshold = 0.05  # 5%エラー率で自動ロールバック
        self.latency_threshold = 1000  # 1秒レイテンシーでロールバック
    
    async def monitor_canary(self, canary_version: str):
        metrics = await self.get_metrics(canary_version)
        
        if metrics.error_rate > self.error_threshold:
            await self.rollback(canary_version, "High error rate")
            return False
        
        if metrics.avg_latency > self.latency_threshold:
            await self.rollback(canary_version, "High latency")
            return False
        
        return True
    
    async def rollback(self, version: str, reason: str):
        logger.warning(f"Rolling back {version}: {reason}")
        await self.kubernetes_client.rollback_deployment(version)
        await self.notify_team(f"Auto-rollback: {reason}")
```

### 3. 災害復旧パターン

#### **バックアップとリストア**
```python
import boto3
from datetime import datetime, timedelta

class DisasterRecovery:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.rds_client = boto3.client('rds')
        self.backup_bucket = "disaster-recovery-backups"
    
    def create_snapshot(self, database_identifier: str):
        snapshot_id = f"{database_identifier}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        response = self.rds_client.create_db_snapshot(
            DBSnapshotIdentifier=snapshot_id,
            DBInstanceIdentifier=database_identifier
        )
        
        return snapshot_id
    
    def restore_from_snapshot(self, snapshot_id: str, new_instance_id: str):
        return self.rds_client.restore_db_instance_from_db_snapshot(
            DBInstanceIdentifier=new_instance_id,
            DBSnapshotIdentifier=snapshot_id,
            MultiAZ=True  # 高可用性のためマルチAZ
        )
    
    def cross_region_backup(self, source_region: str, target_region: str):
        # クロスリージョンバックアップの実装
        pass
```

## ヘルスチェックとモニタリング

### 1. ヘルスチェックエンドポイント

#### **包括的ヘルスチェック**
```python
from fastapi import FastAPI, HTTPException
from typing import Dict, Any
import asyncio

app = FastAPI()

class HealthChecker:
    def __init__(self):
        self.checks = {
            "database": self.check_database,
            "redis": self.check_redis,
            "external_api": self.check_external_api,
            "disk_space": self.check_disk_space,
            "memory": self.check_memory
        }
    
    async def check_database(self) -> Dict[str, Any]:
        try:
            # データベース接続テスト
            result = await db.execute("SELECT 1")
            return {"status": "healthy", "response_time": "5ms"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def check_redis(self) -> Dict[str, Any]:
        try:
            await redis_client.ping()
            return {"status": "healthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def run_all_checks(self) -> Dict[str, Any]:
        results = {}
        overall_status = "healthy"
        
        for name, check_func in self.checks.items():
            results[name] = await check_func()
            if results[name]["status"] != "healthy":
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "checks": results
        }

health_checker = HealthChecker()

@app.get("/health")
async def health_check():
    result = await health_checker.run_all_checks()
    if result["status"] != "healthy":
        raise HTTPException(status_code=503, detail=result)
    return result
```

### 2. プロアクティブモニタリング

#### **メトリクス収集**
```python
import prometheus_client
from prometheus_client import Counter, Histogram, Gauge

# メトリクス定義
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Number of active connections')
ERROR_RATE = Gauge('error_rate', 'Current error rate')

class MetricsCollector:
    def __init__(self):
        self.error_window = []
        self.window_size = 100
    
    def record_request(self, method: str, endpoint: str, status: int, duration: float):
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
        REQUEST_LATENCY.observe(duration)
        
        # エラー率計算
        is_error = status >= 400
        self.error_window.append(is_error)
        
        if len(self.error_window) > self.window_size:
            self.error_window.pop(0)
        
        error_rate = sum(self.error_window) / len(self.error_window)
        ERROR_RATE.set(error_rate)
```

#### **アラート設定**
```yaml
# Prometheus アラートルール
groups:
- name: availability.rules
  rules:
  - alert: HighErrorRate
    expr: error_rate > 0.05
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }}% over the last 2 minutes"
  
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "{{ $labels.instance }} has been down for more than 1 minute"
  
  - alert: HighLatency
    expr: http_request_duration_seconds_p95 > 1.0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High request latency"
      description: "95th percentile latency is {{ $value }}s"
```

## 実装ガイドライン

### 1. 可用性目標設定

```yaml
# SLI/SLO定義
availability_targets:
  slo:
    availability: "99.9%"      # 年間8.76時間のダウンタイム
    latency_p95: "< 500ms"     # 95パーセンタイル
    error_rate: "< 0.1%"       # エラー率
  
  sli:
    availability_measurement: "successful_requests / total_requests"
    latency_measurement: "response_time_p95"
    error_measurement: "5xx_errors / total_requests"
```

### 2. インシデント対応

```python
class IncidentResponse:
    def __init__(self):
        self.severity_levels = {
            "SEV1": {"response_time": 15, "escalation": ["on_call", "manager"]},
            "SEV2": {"response_time": 60, "escalation": ["on_call"]},
            "SEV3": {"response_time": 240, "escalation": ["team"]}
        }
    
    def trigger_incident(self, severity: str, description: str):
        config = self.severity_levels[severity]
        
        # アラート送信
        self.send_alerts(config["escalation"], description)
        
        # インシデント記録
        incident_id = self.create_incident_record(severity, description)
        
        # 自動化された初期対応
        if severity == "SEV1":
            self.initiate_emergency_procedures()
        
        return incident_id
```

### 3. テスト戦略

#### **カオスエンジニアリング**
```python
import random
import asyncio

class ChaosMonkey:
    def __init__(self):
        self.enabled = False
        self.failure_probability = 0.01  # 1%の確率で障害発生
    
    async def random_failure(self):
        if not self.enabled:
            return
        
        if random.random() < self.failure_probability:
            failure_type = random.choice([
                "kill_random_instance",
                "network_partition",
                "disk_full",
                "high_cpu_load"
            ])
            
            await self.simulate_failure(failure_type)
    
    async def simulate_failure(self, failure_type: str):
        logger.info(f"Chaos Monkey: Simulating {failure_type}")
        
        if failure_type == "kill_random_instance":
            await self.kill_random_instance()
        elif failure_type == "network_partition":
            await self.create_network_partition()
        # その他の障害シミュレーション
```

## まとめ

高可用性システムの構築には、適切なパターンの選択と実装が不可欠です。本ドキュメントで紹介されたパターンを組み合わせることで、ビジネス要件に応じた可用性レベルを達成できます。継続的な監視、テスト、改善サイクルを通じて、システムの信頼性を向上させることが重要です。
