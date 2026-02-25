'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TemporalGraphViz } from './TemporalGraphViz'
import {
    RefreshCw,
    GitBranch,
    Zap,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Clock,
    Circle,
    ArrowRightLeft,
    Plus,
    Minus,
    Pen,
} from 'lucide-react'
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────
interface TGNode {
    id: string
    collector_id: string
    entity_key: string
    entity_type: string
    entity_value: string | null
    occurrence_count: number
    first_seen_at: string
    last_seen_at: string
}

interface TGEdge {
    source_node_id: string
    target_node_id: string
    weight: number
}

interface Anomaly {
    node: TGNode
    severity: 'low' | 'medium' | 'high' | 'critical'
    type: string
    description: string
    deviation: number
}

interface Trend {
    node: TGNode
    direction: 'rising' | 'declining' | 'stable'
    changeRate: number
    sparkline: number[]
}

interface Hub {
    id: string
    entity_key: string
    entity_type: string
    entity_value: string | null
    occurrence_count: number
    degree: number
}

interface Snapshot {
    node_count: number
    edge_count: number
    anomaly_count: number
    created_at: string
}

interface TGDiff {
    id: string
    diff_type: 'new' | 'disappeared' | 'changed' | 'stable'
    entity_key: string
    entity_type: string
    old_value: string | null
    new_value: string | null
    occurrence_delta: number
    created_at: string
}

interface GraphApiResponse {
    graph: {
        nodes: TGNode[]
        edges: TGEdge[]
    }
    analytics: {
        anomalies: Anomaly[]
        trends: Trend[]
        hubs: Hub[]
        timeline: Snapshot[]
        diffs: TGDiff[]
        stats: {
            totalNodes: number
            totalEdges: number
            anomalyCount: number
            diffCount: { new: number; disappeared: number; changed: number }
            lastUpdated: string | null
        }
    }
    meta: {
        range: string
        collectorId: string | null
        generatedAt: string
    }
}

interface Collector {
    id: string
    name: string
}

interface Props {
    collectors: Collector[]
}

const TIME_RANGES = [
    { label: '1H', value: '1h' },
    { label: '6H', value: '6h' },
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
]

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export function TemporalGraphClient({ collectors }: Props) {
    const [range, setRange] = useState('24h')
    const [collectorId, setCollectorId] = useState<string>('')
    const [data, setData] = useState<GraphApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const [selectedNode, setSelectedNode] = useState<TGNode | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ range })
            if (collectorId) params.set('collector_id', collectorId)

            const res = await fetch(`/api/admin/temporal-graph?${params}`)
            if (!res.ok) throw new Error('Failed to fetch')
            const json = await res.json()
            setData(json)
        } catch (err) {
            console.error('Failed to fetch temporal graph:', err)
        } finally {
            setLoading(false)
        }
    }, [range, collectorId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Auto-refresh every 30s
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchData])

    const stats = data?.analytics?.stats
    const anomalies = data?.analytics?.anomalies || []
    const trends = data?.analytics?.trends || []
    const hubs = data?.analytics?.hubs || []
    const timeline = data?.analytics?.timeline || []
    const diffs = data?.analytics?.diffs || []
    const diffCount = stats?.diffCount || { new: 0, disappeared: 0, changed: 0 }
    const graphNodes = data?.graph?.nodes || []
    const graphEdges = data?.graph?.edges || []

    // Timeline chart data
    const timelineChartData = timeline.map((s) => ({
        time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nodes: s.node_count,
        edges: s.edge_count,
    }))

    return (
        <div className="space-y-6">
            {/* ─── Controls Bar ─── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    {/* Time Range */}
                    <div className="flex bg-neutral-800/50 rounded-lg p-0.5">
                        {TIME_RANGES.map((tr) => (
                            <button
                                key={tr.value}
                                onClick={() => setRange(tr.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${range === tr.value
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-neutral-400 hover:text-white'
                                    }`}
                            >
                                {tr.label}
                            </button>
                        ))}
                    </div>

                    {/* Collector Filter */}
                    <select
                        value={collectorId}
                        onChange={(e) => setCollectorId(e.target.value)}
                        className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    >
                        <option value="">All Collectors</option>
                        {collectors.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    {/* Auto Refresh Toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${autoRefresh
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-neutral-800/50 text-neutral-400 border border-neutral-700 hover:text-white'
                            }`}
                    >
                        <Circle className={`w-2 h-2 ${autoRefresh ? 'fill-green-400 text-green-400 animate-pulse' : 'fill-neutral-600 text-neutral-600'}`} />
                        {autoRefresh ? 'Live' : 'Paused'}
                    </button>

                    {/* Manual Refresh */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="text-neutral-400 hover:text-white"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* ─── KPI Cards ─── */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Nodes</CardTitle>
                        <GitBranch className="w-4 h-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalNodes ?? 0}</div>
                        <p className="text-xs text-neutral-500 mt-1">Unique entities tracked</p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Edges</CardTitle>
                        <Zap className="w-4 h-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalEdges ?? 0}</div>
                        <p className="text-xs text-neutral-500 mt-1">Entity relationships</p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Anomalies</CardTitle>
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.anomalyCount ?? 0}</div>
                        <p className="text-xs text-neutral-500 mt-1">Statistical deviations</p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">Last Updated</CardTitle>
                        <Clock className="w-4 h-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            {stats?.lastUpdated
                                ? new Date(stats.lastUpdated).toLocaleTimeString()
                                : 'Never'}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Data freshness</p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Graph Visualization ─── */}
            <Card className="bg-neutral-900 border-neutral-800 text-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-medium">Entity Relationship Graph</CardTitle>
                        <p className="text-xs text-neutral-500 mt-1">
                            Force-directed layout • Hover to inspect • Scroll to zoom • Drag to pan
                        </p>
                    </div>
                    {graphNodes.length > 0 && (
                        <Badge className="bg-neutral-800 text-neutral-400 border-0">
                            {graphNodes.length} nodes · {graphEdges.length} edges
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="h-[500px] bg-neutral-950/50 border-t border-neutral-800">
                        {loading && graphNodes.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <RefreshCw className="w-8 h-8 text-neutral-600 animate-spin" />
                            </div>
                        ) : (
                            <TemporalGraphViz
                                nodes={graphNodes}
                                edges={graphEdges}
                                onNodeClick={(node) => setSelectedNode(node as TGNode)}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ─── Node Inspector (shown when a node is clicked) ─── */}
            {selectedNode && (
                <Card className="bg-neutral-900 border-orange-500/20 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Node Inspector</CardTitle>
                        <button onClick={() => setSelectedNode(null)} className="text-neutral-400 hover:text-white text-xs">
                            ✕ Close
                        </button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-neutral-500 text-xs">Entity</p>
                                <p className="font-mono text-orange-400 truncate">{selectedNode.entity_value || selectedNode.entity_key}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs">Type</p>
                                <p className="capitalize">{selectedNode.entity_type}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs">Seen</p>
                                <p>{selectedNode.occurrence_count}×</p>
                            </div>
                            <div>
                                <p className="text-neutral-500 text-xs">Last Seen</p>
                                <p>{new Date(selectedNode.last_seen_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Bottom Row: Anomalies + Trends ─── */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Anomaly Feed */}
                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                            Anomaly Feed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {anomalies.length === 0 ? (
                            <p className="text-neutral-500 text-sm text-center py-8">
                                No anomalies detected in this time window
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {anomalies.slice(0, 20).map((anomaly, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-neutral-800/30 border border-neutral-800 hover:border-neutral-700 transition-colors"
                                    >
                                        <Badge
                                            className={`${SEVERITY_COLORS[anomaly.severity]} border text-[10px] font-bold uppercase shrink-0 mt-0.5`}
                                        >
                                            {anomaly.severity}
                                        </Badge>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-neutral-200 leading-snug">{anomaly.description}</p>
                                            <p className="text-xs text-neutral-500 mt-1 font-mono truncate">{anomaly.node.entity_key}</p>
                                        </div>
                                        {anomaly.type === 'spike' && <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />}
                                        {anomaly.type === 'new_entity' && <Zap className="w-4 h-4 text-blue-400 shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Trending Entities */}
                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            Trending Entities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {trends.length === 0 ? (
                            <p className="text-neutral-500 text-sm text-center py-8">
                                Not enough data for trend analysis yet
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {trends.slice(0, 15).map((trend, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-800/30 border border-neutral-800 hover:border-neutral-700 transition-colors"
                                    >
                                        {trend.direction === 'rising' ? (
                                            <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
                                        ) : trend.direction === 'declining' ? (
                                            <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
                                        ) : (
                                            <div className="w-4 h-0.5 bg-neutral-600 shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-mono text-neutral-200 truncate">
                                                {trend.node.entity_value || trend.node.entity_key}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-xs font-bold ${trend.direction === 'rising' ? 'text-green-400' :
                                                trend.direction === 'declining' ? 'text-red-400' :
                                                    'text-neutral-500'
                                                }`}>
                                                {trend.changeRate}/hr
                                            </p>
                                            <p className="text-[10px] text-neutral-500">{trend.node.occurrence_count}× total</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ─── Diff Feed ─── */}
            {diffs.length > 0 && (
                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                            Change Detection
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {diffCount.new > 0 && (
                                <Badge className="bg-green-500/10 text-green-400 border-0 text-[10px]">
                                    +{diffCount.new} new
                                </Badge>
                            )}
                            {diffCount.changed > 0 && (
                                <Badge className="bg-yellow-500/10 text-yellow-400 border-0 text-[10px]">
                                    ~{diffCount.changed} changed
                                </Badge>
                            )}
                            {diffCount.disappeared > 0 && (
                                <Badge className="bg-red-500/10 text-red-400 border-0 text-[10px]">
                                    -{diffCount.disappeared} gone
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                            {diffs.map((diff, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-800/30 border border-neutral-800 hover:border-neutral-700 transition-colors"
                                >
                                    {/* Icon by type */}
                                    {diff.diff_type === 'new' && (
                                        <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                            <Plus className="w-3 h-3 text-green-400" />
                                        </div>
                                    )}
                                    {diff.diff_type === 'disappeared' && (
                                        <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                            <Minus className="w-3 h-3 text-red-400" />
                                        </div>
                                    )}
                                    {diff.diff_type === 'changed' && (
                                        <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                                            <Pen className="w-3 h-3 text-yellow-400" />
                                        </div>
                                    )}

                                    {/* Entity info */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-mono text-neutral-200 truncate">
                                            {diff.entity_key}
                                        </p>
                                        {diff.diff_type === 'changed' && diff.old_value && diff.new_value && (
                                            <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                                <span className="text-red-400 line-through">{diff.old_value}</span>
                                                {' → '}
                                                <span className="text-green-400">{diff.new_value}</span>
                                            </p>
                                        )}
                                        {diff.diff_type === 'new' && diff.new_value && (
                                            <p className="text-xs text-green-400/60 mt-0.5 truncate">{diff.new_value}</p>
                                        )}
                                        {diff.diff_type === 'disappeared' && diff.old_value && (
                                            <p className="text-xs text-red-400/60 mt-0.5 truncate line-through">{diff.old_value}</p>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-[10px] text-neutral-600 shrink-0">
                                        {new Date(diff.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Hub Nodes ─── */}
            {hubs.length > 0 && (
                <Card className="bg-neutral-900 border-neutral-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-purple-400" />
                            Hub Nodes (Most Connected)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {hubs.map((hub) => (
                                <div
                                    key={hub.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-colors"
                                >
                                    <span className="text-sm font-mono text-purple-300 truncate max-w-[180px]">
                                        {hub.entity_value || hub.entity_key}
                                    </span>
                                    <Badge className="bg-purple-500/10 text-purple-400 border-0 text-[10px]">
                                        {hub.degree} connections
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Timeline Chart ─── */}
            {timelineChartData.length > 1 && (
                <Card className="bg-neutral-900 border-neutral-800 text-white p-6">
                    <h3 className="text-lg font-medium tracking-tight mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        Graph Growth Timeline
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineChartData}>
                                <defs>
                                    <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorEdges" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    stroke="#525252"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#525252"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#171717',
                                        border: '1px solid #262626',
                                        borderRadius: '8px',
                                    }}
                                    itemStyle={{ color: '#a3a3a3' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="nodes"
                                    stroke="#a855f7"
                                    fill="url(#colorNodes)"
                                    strokeWidth={2}
                                    name="Nodes"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="edges"
                                    stroke="#3b82f6"
                                    fill="url(#colorEdges)"
                                    strokeWidth={2}
                                    name="Edges"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}
        </div>
    )
}
