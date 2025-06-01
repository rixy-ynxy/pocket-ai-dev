from dataclasses import dataclass
from typing import Dict, List, Optional
import logging
from datetime import datetime
import asyncio
import aiohttp
from fastapi import FastAPI, HTTPException, BackgroundTasks

# Code Quality Metrics
@dataclass
class CoverageMetrics:
    percentage: float
    uncovered_lines: List[int]
    trends: Dict[str, float]

@dataclass
class ComplexityMetrics:
    average: float
    hotspots: List[Dict[str, any]]
    trends: Dict[str, float]

@dataclass
class QualityMetrics:
    timestamp: datetime
    coverage: CoverageMetrics
    complexity: ComplexityMetrics
    duplication: float

class CodeQualityCollector:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def collect_metrics(self) -> QualityMetrics:
        """コード品質メトリクスの収集"""
        coverage = await self.collect_coverage()
        complexity = await self.collect_complexity()
        duplication = await self.collect_duplication()
        
        return QualityMetrics(
            timestamp=datetime.now(),
            coverage=coverage,
            complexity=complexity,
            duplication=duplication
        )

    async def collect_coverage(self) -> CoverageMetrics:
        """テストカバレッジの収集"""
        try:
            test_results = await self.run_tests()
            return CoverageMetrics(
                percentage=self.calculate_coverage(test_results),
                uncovered_lines=self.find_uncovered_lines(test_results),
                trends=await self.analyze_coverage_trends()
            )
        except Exception as e:
            self.logger.error(f"Coverage collection failed: {str(e)}")
            raise

    async def collect_complexity(self) -> ComplexityMetrics:
        """コード複雑度の分析"""
        try:
            analysis = await self.run_static_analysis()
            return ComplexityMetrics(
                average=self.calculate_average_complexity(analysis),
                hotspots=self.find_complexity_hotspots(analysis),
                trends=await self.analyze_complexity_trends()
            )
        except Exception as e:
            self.logger.error(f"Complexity analysis failed: {str(e)}")
            raise

# Performance Metrics
@dataclass
class EndpointMetrics:
    response_time: float
    error_rate: float
    throughput: float
    timestamp: datetime

class PerformanceMonitor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.thresholds = {
            "response_time": 300,  # ms
            "error_rate": 1.0,    # %
            "throughput": 100     # req/s
        }

    async def monitor_endpoint(self, endpoint: str) -> EndpointMetrics:
        """エンドポイントのパフォーマンス監視"""
        try:
            metrics = await self.collect_endpoint_metrics(endpoint)
            await self.analyze_performance(metrics)
            await self.store_metrics(metrics)
            
            if self.should_alert(metrics):
                await self.send_alert(metrics)
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Performance monitoring failed: {str(e)}")
            raise

    async def collect_endpoint_metrics(self, endpoint: str) -> EndpointMetrics:
        """メトリクスの収集"""
        async with aiohttp.ClientSession() as session:
            start_time = datetime.now()
            try:
                async with session.get(endpoint) as response:
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    return EndpointMetrics(
                        response_time=response_time,
                        error_rate=await self.calculate_error_rate(endpoint),
                        throughput=await self.measure_throughput(endpoint),
                        timestamp=datetime.now()
                    )
            except Exception as e:
                self.logger.error(f"Endpoint metrics collection failed: {str(e)}")
                raise

    def should_alert(self, metrics: EndpointMetrics) -> bool:
        """アラート条件の判定"""
        return (
            metrics.response_time > self.thresholds["response_time"] or
            metrics.error_rate > self.thresholds["error_rate"] or
            metrics.throughput < self.thresholds["throughput"]
        )

    async def send_alert(self, metrics: EndpointMetrics):
        """アラートの送信"""
        alert = {
            "timestamp": metrics.timestamp,
            "endpoint": endpoint,
            "metrics": {
                "response_time": metrics.response_time,
                "error_rate": metrics.error_rate,
                "throughput": metrics.throughput
            },
            "thresholds": self.thresholds
        }
        await self.alert_service.send(alert)

# Development Velocity Metrics
@dataclass
class SprintMetrics:
    sprint_id: str
    completion: float
    velocity: float
    predictability: float
    start_date: datetime
    end_date: datetime

@dataclass
class CompletionMetrics:
    planned: int
    completed: int
    percentage: float

class VelocityTracker:
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)

    async def track_sprint(self, sprint_id: str) -> SprintMetrics:
        """スプリントのメトリクス追跡"""
        try:
            sprint = await self.load_sprint_data(sprint_id)
            metrics = await self.calculate_sprint_metrics(sprint)
            await self.update_trends(metrics)
            
            completion = self.calculate_completion(sprint)
            velocity = self.calculate_velocity(sprint)
            predictability = await self.analyze_predictability(sprint)
            
            return SprintMetrics(
                sprint_id=sprint_id,
                completion=completion,
                velocity=velocity,
                predictability=predictability,
                start_date=sprint.start_date,
                end_date=sprint.end_date
            )
            
        except Exception as e:
            self.logger.error(f"Sprint tracking failed: {str(e)}")
            raise

    def calculate_completion(self, sprint: Sprint) -> CompletionMetrics:
        """完了率の計算"""
        return CompletionMetrics(
            planned=sprint.planned_points,
            completed=sprint.completed_points,
            percentage=(sprint.completed_points / sprint.planned_points) * 100
        )

    async def analyze_predictability(self, sprint: Sprint) -> float:
        """予測精度の分析"""
        historical_data = await self.get_historical_sprints(
            limit=5,
            team_id=sprint.team_id
        )
        
        variance = self.calculate_variance(historical_data)
        trend = self.analyze_trend(historical_data)
        risk_factors = self.identify_risk_factors(sprint)
        
        return self.calculate_predictability_score(
            variance=variance,
            trend=trend,
            risk_factors=risk_factors
        ) 