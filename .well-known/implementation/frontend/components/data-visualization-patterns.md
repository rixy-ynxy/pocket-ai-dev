# データ可視化パターン (Data Visualization Patterns)

## 概要

データドリブンアプリケーションにおける効果的な可視化パターンとダッシュボード設計の実証済み手法を定義します。Chart.js、React、TypeScript を活用した高品質なデータ表示とインタラクティブな分析機能の構築方法を提供します。

## 基本データ可視化パターン

### 1. Chart.js統合パターン

#### **React Chart.js設定**
```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2'

// Chart.js登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// 基本チャート設定
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          size: 11
        }
      }
    }
  }
}

// カラーパレット
export const chartColors = {
  primary: 'rgba(59, 130, 246, 0.8)',
  primaryBorder: 'rgb(59, 130, 246)',
  secondary: 'rgba(16, 185, 129, 0.8)',
  secondaryBorder: 'rgb(16, 185, 129)',
  warning: 'rgba(245, 158, 11, 0.8)',
  warningBorder: 'rgb(245, 158, 11)',
  danger: 'rgba(239, 68, 68, 0.8)',
  dangerBorder: 'rgb(239, 68, 68)',
  info: 'rgba(99, 102, 241, 0.8)',
  infoBorder: 'rgb(99, 102, 241)',
  gradient: {
    primary: 'linear-gradient(180deg, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.1) 100%)',
    secondary: 'linear-gradient(180deg, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0.1) 100%)'
  }
}
```

### 2. チャートコンポーネントパターン

#### **時系列データチャート**
```typescript
import { useEffect, useMemo } from 'react'
import { Line } from 'react-chartjs-2'

interface TimeSeriesData {
  timestamp: string
  value: number
  label?: string
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[]
  title: string
  yAxisLabel?: string
  timeFormat?: 'hour' | 'day' | 'month' | 'year'
  showArea?: boolean
  height?: number
  onDataPointClick?: (dataPoint: TimeSeriesData) => void
}

export function TimeSeriesChart({
  data,
  title,
  yAxisLabel = 'Values',
  timeFormat = 'day',
  showArea = false,
  height = 300,
  onDataPointClick
}: TimeSeriesChartProps) {
  // データ前処理
  const processedData = useMemo(() => {
    const sortedData = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const labels = sortedData.map(item => {
      const date = new Date(item.timestamp)
      switch (timeFormat) {
        case 'hour':
          return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        case 'day':
          return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
        case 'month':
          return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })
        case 'year':
          return date.getFullYear().toString()
        default:
          return date.toLocaleDateString('ja-JP')
      }
    })

    const values = sortedData.map(item => item.value)

    return { labels, values, originalData: sortedData }
  }, [data, timeFormat])

  // チャートデータ
  const chartData = {
    labels: processedData.labels,
    datasets: [
      {
        label: title,
        data: processedData.values,
        borderColor: chartColors.primaryBorder,
        backgroundColor: showArea ? chartColors.primary : 'transparent',
        fill: showArea,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: chartColors.primaryBorder,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  }

  // チャート設定
  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales?.y,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel
        }
      }
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onDataPointClick) {
        const dataIndex = elements[0].index
        const dataPoint = processedData.originalData[dataIndex]
        onDataPointClick(dataPoint)
      }
    }
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// 使用例
export function UserActivityChart() {
  const [activityData, setActivityData] = useState<TimeSeriesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivityData() {
      try {
        const response = await fetch('/api/analytics/user-activity')
        const data = await response.json()
        setActivityData(data)
      } catch (error) {
        console.error('Failed to fetch activity data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivityData()
  }, [])

  const handleDataPointClick = (dataPoint: TimeSeriesData) => {
    console.log('Clicked data point:', dataPoint)
    // 詳細表示やドリルダウンの実装
  }

  if (loading) {
    return <ChartSkeleton height={300} />
  }

  return (
    <TimeSeriesChart
      data={activityData}
      title="ユーザーアクティビティ推移"
      yAxisLabel="アクティブユーザー数"
      timeFormat="day"
      showArea={true}
      height={300}
      onDataPointClick={handleDataPointClick}
    />
  )
}
```

#### **メトリクスダッシュボード**
```typescript
import { Bar, Doughnut } from 'react-chartjs-2'

interface MetricCard {
  title: string
  value: number
  previousValue?: number
  unit?: string
  format?: 'number' | 'percentage' | 'currency' | 'duration'
  trend?: 'up' | 'down' | 'neutral'
}

interface DashboardData {
  overview: {
    totalUsers: number
    activeUsers: number
    newUsers: number
    retention: number
  }
  chartData: {
    usersByCategory: Array<{ category: string; count: number }>
    monthlyGrowth: Array<{ month: string; users: number; revenue: number }>
  }
}

export function MetricsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)

  // データ取得
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/dashboard?range=${timeRange}`)
        const data = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    
    // 自動更新（30秒間隔）
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  if (loading || !dashboardData) {
    return <DashboardSkeleton />
  }

  // メトリクスカード
  const metrics: MetricCard[] = [
    {
      title: 'ユーザー総数',
      value: dashboardData.overview.totalUsers,
      format: 'number',
      trend: 'up'
    },
    {
      title: 'アクティブユーザー',
      value: dashboardData.overview.activeUsers,
      format: 'number',
      trend: 'up'
    },
    {
      title: '新規ユーザー',
      value: dashboardData.overview.newUsers,
      format: 'number',
      trend: 'neutral'
    },
    {
      title: 'リテンション率',
      value: dashboardData.overview.retention,
      format: 'percentage',
      trend: 'up'
    }
  ]

  // カテゴリー別チャートデータ
  const categoryChartData = {
    labels: dashboardData.chartData.usersByCategory.map(item => item.category),
    datasets: [
      {
        label: 'ユーザー数',
        data: dashboardData.chartData.usersByCategory.map(item => item.count),
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.warning,
          chartColors.danger,
          chartColors.info
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  }

  // 成長チャートデータ
  const growthChartData = {
    labels: dashboardData.chartData.monthlyGrowth.map(item => item.month),
    datasets: [
      {
        label: 'ユーザー数',
        data: dashboardData.chartData.monthlyGrowth.map(item => item.users),
        backgroundColor: chartColors.primary,
        borderColor: chartColors.primaryBorder,
        borderWidth: 1
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* 時間範囲選択 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <TimeRangeSelector
          value={timeRange}
          onChange={setTimeRange}
          options={[
            { value: '7d', label: '7日間' },
            { value: '30d', label: '30日間' },
            { value: '90d', label: '90日間' }
          ]}
        />
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* カテゴリー別分布 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">カテゴリー別ユーザー分布</h3>
          <div style={{ height: '300px' }}>
            <Doughnut
              data={categoryChartData}
              options={{
                ...defaultChartOptions,
                plugins: {
                  ...defaultChartOptions.plugins,
                  legend: {
                    position: 'right' as const
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 月次成長 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">月次ユーザー成長</h3>
          <div style={{ height: '300px' }}>
            <Bar
              data={growthChartData}
              options={{
                ...defaultChartOptions,
                scales: {
                  ...defaultChartOptions.scales,
                  y: {
                    ...defaultChartOptions.scales?.y,
                    title: {
                      display: true,
                      text: 'ユーザー数'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 3. インタラクティブチャートパターン

#### **ドリルダウン機能**
```typescript
interface DrilldownData {
  id: string
  label: string
  value: number
  children?: DrilldownData[]
  metadata?: Record<string, any>
}

interface DrilldownChartProps {
  data: DrilldownData[]
  onDrilldown?: (item: DrilldownData) => void
  onBreadcrumbClick?: (level: number) => void
}

export function DrilldownChart({ data, onDrilldown, onBreadcrumbClick }: DrilldownChartProps) {
  const [currentData, setCurrentData] = useState<DrilldownData[]>(data)
  const [breadcrumb, setBreadcrumb] = useState<DrilldownData[]>([])

  const handleChartClick = (elements: any[], chart: any) => {
    if (elements.length > 0) {
      const dataIndex = elements[0].index
      const clickedItem = currentData[dataIndex]
      
      if (clickedItem.children && clickedItem.children.length > 0) {
        // ドリルダウン実行
        setBreadcrumb(prev => [...prev, clickedItem])
        setCurrentData(clickedItem.children!)
        onDrilldown?.(clickedItem)
      }
    }
  }

  const handleBreadcrumbClick = (level: number) => {
    if (level === 0) {
      // ルートレベルに戻る
      setCurrentData(data)
      setBreadcrumb([])
    } else {
      // 指定レベルに戻る
      const targetItem = breadcrumb[level - 1]
      setCurrentData(targetItem.children!)
      setBreadcrumb(prev => prev.slice(0, level))
    }
    onBreadcrumbClick?.(level)
  }

  const chartData = {
    labels: currentData.map(item => item.label),
    datasets: [
      {
        label: 'Value',
        data: currentData.map(item => item.value),
        backgroundColor: currentData.map((_, index) => {
          const colors = [
            chartColors.primary,
            chartColors.secondary,
            chartColors.warning,
            chartColors.danger,
            chartColors.info
          ]
          return colors[index % colors.length]
        })
      }
    ]
  }

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      tooltip: {
        ...defaultChartOptions.plugins?.tooltip,
        callbacks: {
          afterLabel: (context: any) => {
            const item = currentData[context.dataIndex]
            return item.children ? '(クリックして詳細表示)' : ''
          }
        }
      }
    },
    onClick: handleChartClick
  }

  return (
    <div>
      {/* パンくずリスト */}
      {breadcrumb.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button
                onClick={() => handleBreadcrumbClick(0)}
                className="text-blue-600 hover:text-blue-800"
              >
                ホーム
              </button>
            </li>
            {breadcrumb.map((item, index) => (
              <li key={item.id} className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(index + 1)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* チャート */}
      <div style={{ height: '400px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}
```

## 高度データ可視化パターン

### 1. リアルタイムチャート

#### **ライブデータストリーミング**
```typescript
import { useEffect, useRef, useState } from 'react'

interface RealtimeDataPoint {
  timestamp: number
  value: number
}

interface RealtimeChartProps {
  dataSource: string
  maxDataPoints?: number
  updateInterval?: number
  title: string
}

export function RealtimeChart({
  dataSource,
  maxDataPoints = 50,
  updateInterval = 1000,
  title
}: RealtimeChartProps) {
  const [dataPoints, setDataPoints] = useState<RealtimeDataPoint[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    // WebSocket接続
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket(dataSource)
        
        wsRef.current.onopen = () => {
          setIsConnected(true)
          console.log('WebSocket connected')
        }
        
        wsRef.current.onmessage = (event) => {
          const newDataPoint: RealtimeDataPoint = JSON.parse(event.data)
          
          setDataPoints(prev => {
            const updated = [...prev, newDataPoint]
            // 最大データポイント数を超えた場合、古いデータを削除
            if (updated.length > maxDataPoints) {
              return updated.slice(-maxDataPoints)
            }
            return updated
          })
        }
        
        wsRef.current.onclose = () => {
          setIsConnected(false)
          console.log('WebSocket disconnected')
          
          // 再接続試行
          setTimeout(connectWebSocket, 3000)
        }
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error)
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [dataSource, maxDataPoints])

  // チャートデータの更新
  const chartData = useMemo(() => {
    const labels = dataPoints.map(point => 
      new Date(point.timestamp).toLocaleTimeString('ja-JP')
    )
    
    return {
      labels,
      datasets: [
        {
          label: title,
          data: dataPoints.map(point => point.value),
          borderColor: chartColors.primaryBorder,
          backgroundColor: chartColors.primary,
          fill: true,
          tension: 0.4,
          pointRadius: 0 // リアルタイムチャートではポイントを非表示
        }
      ]
    }
  }, [dataPoints, title])

  const options = {
    ...defaultChartOptions,
    animation: {
      duration: 0 // アニメーションを無効化してパフォーマンス向上
    },
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: `${title} ${isConnected ? '🟢' : '🔴'}`
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      x: {
        ...defaultChartOptions.scales?.x,
        display: false // リアルタイムでは時間軸ラベルを簡略化
      }
    }
  }

  return (
    <div>
      <div style={{ height: '300px' }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* 接続ステータス */}
      <div className="mt-2 text-sm text-gray-600">
        ステータス: {isConnected ? '接続中' : '切断中'}
        {!isConnected && <span className="ml-2">再接続中...</span>}
      </div>
    </div>
  )
}
```

### 2. 比較チャートパターン

#### **A/Bテスト結果表示**
```typescript
interface ABTestResult {
  variantA: {
    name: string
    conversions: number
    visitors: number
    conversionRate: number
    confidence: number
  }
  variantB: {
    name: string
    conversions: number
    visitors: number
    conversionRate: number
    confidence: number
  }
  testDuration: number
  significance: 'significant' | 'not_significant' | 'trending'
}

export function ABTestChart({ result }: { result: ABTestResult }) {
  // 比較チャートデータ
  const comparisonData = {
    labels: [result.variantA.name, result.variantB.name],
    datasets: [
      {
        label: 'コンバージョン率 (%)',
        data: [
          (result.variantA.conversionRate * 100).toFixed(2),
          (result.variantB.conversionRate * 100).toFixed(2)
        ],
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary
        ],
        borderColor: [
          chartColors.primaryBorder,
          chartColors.secondaryBorder
        ],
        borderWidth: 2
      }
    ]
  }

  // 信頼度チャートデータ
  const confidenceData = {
    labels: [result.variantA.name, result.variantB.name],
    datasets: [
      {
        label: '信頼度 (%)',
        data: [result.variantA.confidence, result.variantB.confidence],
        backgroundColor: [
          chartColors.info,
          chartColors.warning
        ]
      }
    ]
  }

  const getSignificanceColor = () => {
    switch (result.significance) {
      case 'significant':
        return 'text-green-600'
      case 'trending':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getSignificanceText = () => {
    switch (result.significance) {
      case 'significant':
        return '統計的に有意'
      case 'trending':
        return '有意に近い傾向'
      default:
        return '有意差なし'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">A/Bテスト結果</h3>
        <div className="flex items-center space-x-4 text-sm">
          <span>テスト期間: {result.testDuration}日</span>
          <span className={`font-medium ${getSignificanceColor()}`}>
            {getSignificanceText()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* コンバージョン率比較 */}
        <div>
          <h4 className="text-md font-medium mb-3">コンバージョン率比較</h4>
          <div style={{ height: '250px' }}>
            <Bar
              data={comparisonData}
              options={{
                ...defaultChartOptions,
                plugins: {
                  ...defaultChartOptions.plugins,
                  tooltip: {
                    callbacks: {
                      afterLabel: (context: any) => {
                        const variant = context.dataIndex === 0 ? result.variantA : result.variantB
                        return [
                          `訪問者数: ${variant.visitors.toLocaleString()}`,
                          `コンバージョン数: ${variant.conversions.toLocaleString()}`
                        ]
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'コンバージョン率 (%)'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 信頼度表示 */}
        <div>
          <h4 className="text-md font-medium mb-3">統計的信頼度</h4>
          <div style={{ height: '250px' }}>
            <Doughnut
              data={confidenceData}
              options={{
                ...defaultChartOptions,
                plugins: {
                  ...defaultChartOptions.plugins,
                  legend: {
                    position: 'bottom' as const
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <h5 className="font-medium text-gray-900">{result.variantA.name}</h5>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div>訪問者: {result.variantA.visitors.toLocaleString()}</div>
            <div>コンバージョン: {result.variantA.conversions.toLocaleString()}</div>
            <div>率: {(result.variantA.conversionRate * 100).toFixed(2)}%</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded">
          <h5 className="font-medium text-gray-900">{result.variantB.name}</h5>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div>訪問者: {result.variantB.visitors.toLocaleString()}</div>
            <div>コンバージョン: {result.variantB.conversions.toLocaleString()}</div>
            <div>率: {(result.variantB.conversionRate * 100).toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## ユーティリティとヘルパー

### 1. データ変換ユーティリティ

#### **チャート用データフォーマッター**
```typescript
export class ChartDataFormatter {
  // 数値フォーマット
  static formatNumber(value: number, format: 'number' | 'percentage' | 'currency' | 'compact' = 'number'): string {
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`
      case 'currency':
        return new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY'
        }).format(value)
      case 'compact':
        return new Intl.NumberFormat('ja-JP', {
          notation: 'compact',
          compactDisplay: 'short'
        }).format(value)
      default:
        return new Intl.NumberFormat('ja-JP').format(value)
    }
  }

  // 時系列データの集約
  static aggregateTimeSeriesData(
    data: Array<{ timestamp: string; value: number }>,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ) {
    const grouped = new Map<string, number[]>()

    data.forEach(item => {
      const date = new Date(item.timestamp)
      let key: string

      switch (granularity) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
          break
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`
          break
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`
          break
      }

      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(item.value)
    })

    return Array.from(grouped.entries()).map(([key, values]) => ({
      timestamp: key,
      value: values.reduce((sum, val) => sum + val, 0) / values.length, // 平均値
      sum: values.reduce((sum, val) => sum + val, 0), // 合計値
      count: values.length
    }))
  }

  // トレンド計算
  static calculateTrend(data: number[]): 'up' | 'down' | 'neutral' {
    if (data.length < 2) return 'neutral'

    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

    const change = (secondAvg - firstAvg) / firstAvg

    if (Math.abs(change) < 0.05) return 'neutral' // 5%未満の変化は中立
    return change > 0 ? 'up' : 'down'
  }
}
```

### 2. チャート共通コンポーネント

#### **ローディングとエラー状態**
```typescript
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height: `${height}px` }}>
      <div className="bg-gray-200 rounded h-full flex items-center justify-center">
        <div className="text-gray-400 text-sm">チャートを読み込み中...</div>
      </div>
    </div>
  )
}

export function ChartError({ 
  message = 'データの読み込みに失敗しました',
  onRetry 
}: { 
  message?: string
  onRetry?: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 mb-2">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          再試行
        </button>
      )}
    </div>
  )
}

export function EmptyChart({ 
  message = 'データがありません',
  height = 300 
}: { 
  message?: string
  height?: number 
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center text-gray-500"
      style={{ height: `${height}px` }}
    >
      <div className="mb-2">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-sm">{message}</p>
    </div>
  )
}
```

## パフォーマンス最適化

### 1. チャートレンダリング最適化

#### **仮想化とメモ化**
```typescript
import { memo, useMemo } from 'react'

export const OptimizedChart = memo<ChartProps>(({ data, options, type = 'line' }) => {
  // データの変更時のみ再計算
  const chartData = useMemo(() => {
    return processChartData(data)
  }, [data])

  // オプションの変更時のみ再計算
  const chartOptions = useMemo(() => {
    return {
      ...defaultChartOptions,
      ...options,
      // パフォーマンス向上のための設定
      animation: {
        duration: data.length > 100 ? 0 : 750 // 大量データでは無効化
      },
      elements: {
        point: {
          radius: data.length > 50 ? 0 : 3 // 多数データポイントでは非表示
        }
      }
    }
  }, [options, data.length])

  const ChartComponent = getChartComponent(type)

  return <ChartComponent data={chartData} options={chartOptions} />
})

// 大量データ用サンプリング
export function sampleData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data

  const interval = Math.floor(data.length / maxPoints)
  return data.filter((_, index) => index % interval === 0)
}
```

## まとめ

データ可視化パターンの適切な実装により、ユーザーにとって理解しやすく、意思決定に役立つダッシュボードを構築できます。Chart.js、React、TypeScriptの組み合わせは、インタラクティブで高性能な可視化コンポーネントの開発を可能にします。リアルタイム更新、ドリルダウン機能、A/Bテスト結果表示など、ビジネス要件に応じた高度な機能も実装可能です。 