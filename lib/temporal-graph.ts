import { createAdminClient } from './supabase/admin'

// ─── Types ───────────────────────────────────────────────────────
export interface TGNode {
    id: string
    collector_id: string
    entity_key: string
    entity_type: string
    entity_value: string | null
    occurrence_count: number
    first_seen_at: string
    last_seen_at: string
    metadata: Record<string, unknown>
}

export interface TGEdge {
    id: string
    collector_id: string
    source_node_id: string
    target_node_id: string
    weight: number
    first_seen_at: string
    last_seen_at: string
}

export interface TGSnapshot {
    id: string
    collector_id: string
    node_count: number
    edge_count: number
    anomaly_count: number
    avg_occurrence: number
    created_at: string
}

export interface GraphData {
    nodes: TGNode[]
    edges: TGEdge[]
}

export interface AnomalyResult {
    node: TGNode
    severity: 'low' | 'medium' | 'high' | 'critical'
    type: 'spike' | 'drop' | 'new_entity' | 'hub'
    description: string
    deviation: number
}

export interface TrendResult {
    node: TGNode
    direction: 'rising' | 'declining' | 'stable'
    changeRate: number
    sparkline: number[]
}

export interface GraphAnalytics {
    anomalies: AnomalyResult[]
    trends: TrendResult[]
    hubs: (TGNode & { degree: number })[]
    timeline: TGSnapshot[]
    stats: {
        totalNodes: number
        totalEdges: number
        anomalyCount: number
        lastUpdated: string | null
    }
}

// ─── Entity Extraction ──────────────────────────────────────────
interface ExtractedEntity {
    key: string
    type: string
    value: string
}

/**
 * Recursively extracts entities from a JSONB payload.
 * Identifies URLs, numbers, dates, and text values.
 */
function extractEntities(data: unknown, prefix = ''): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    if (data === null || data === undefined) return entities

    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            entities.push(...extractEntities(item, `${prefix}[${index}]`))
        })
        return entities
    }

    if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            const fullKey = prefix ? `${prefix}.${key}` : key

            // The key itself is an entity (structural)
            entities.push({
                key: `field:${key}`,
                type: 'field',
                value: key,
            })

            // Recurse into nested values
            if (typeof value === 'object' && value !== null) {
                entities.push(...extractEntities(value, fullKey))
            } else if (typeof value === 'string') {
                const trimmed = value.trim()
                if (!trimmed) continue

                // Classify the string value
                if (/^https?:\/\//.test(trimmed)) {
                    entities.push({ key: `url:${trimmed}`, type: 'url', value: trimmed })
                } else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                    entities.push({ key: `date:${trimmed}`, type: 'date', value: trimmed })
                } else if (trimmed.length <= 100) {
                    entities.push({ key: `text:${trimmed.toLowerCase()}`, type: 'text', value: trimmed })
                }
            } else if (typeof value === 'number') {
                entities.push({
                    key: `num:${fullKey}:${value}`,
                    type: 'number',
                    value: String(value),
                })
            }
        }
        return entities
    }

    // Primitive at top level
    if (typeof data === 'string' && data.trim()) {
        entities.push({ key: `text:${data.trim().toLowerCase()}`, type: 'text', value: data.trim() })
    }

    return entities
}

/**
 * Deduplicate entities by key, keeping the first occurrence.
 */
function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>()
    return entities.filter((e) => {
        if (seen.has(e.key)) return false
        seen.add(e.key)
        return true
    })
}

// ─── Core Processing ────────────────────────────────────────────

/**
 * Process scraped data into the temporal graph.
 * Called after each successful scrape — upserts nodes and creates/strengthens edges.
 */
export async function processScrapedData(
    collectorId: string,
    extractedData: { results: unknown[] }
): Promise<{ nodesProcessed: number; edgesProcessed: number }> {
    const supabase = createAdminClient()

    // 1. Extract entities from the payload
    const rawEntities = extractEntities(extractedData)
    const entities = deduplicateEntities(rawEntities)

    if (entities.length === 0) {
        return { nodesProcessed: 0, edgesProcessed: 0 }
    }

    // Cap at 200 entities per scrape to avoid explosive graph growth
    const cappedEntities = entities.slice(0, 200)

    // 2. Upsert nodes — increment occurrence_count, update last_seen_at
    const nodeIds: Map<string, string> = new Map()

    for (const entity of cappedEntities) {
        // Try to find existing node
        const { data: existing } = await supabase
            .from('tg_nodes')
            .select('id, occurrence_count')
            .eq('collector_id', collectorId)
            .eq('entity_key', entity.key)
            .single()

        if (existing) {
            // Update existing node
            await supabase
                .from('tg_nodes')
                .update({
                    occurrence_count: existing.occurrence_count + 1,
                    last_seen_at: new Date().toISOString(),
                    entity_value: entity.value,
                })
                .eq('id', existing.id)

            nodeIds.set(entity.key, existing.id)
        } else {
            // Insert new node
            const { data: newNode } = await supabase
                .from('tg_nodes')
                .insert({
                    collector_id: collectorId,
                    entity_key: entity.key,
                    entity_type: entity.type,
                    entity_value: entity.value,
                })
                .select('id')
                .single()

            if (newNode) {
                nodeIds.set(entity.key, newNode.id)
            }
        }
    }

    // 3. Create/strengthen edges between co-occurring entities
    //    We connect entities that appeared in the same scrape
    //    Limit edge creation to avoid O(n²) explosion
    const nodeEntries = Array.from(nodeIds.entries())
    let edgesProcessed = 0
    const maxEdgePairs = 500

    for (let i = 0; i < nodeEntries.length && edgesProcessed < maxEdgePairs; i++) {
        for (let j = i + 1; j < nodeEntries.length && edgesProcessed < maxEdgePairs; j++) {
            const [, sourceId] = nodeEntries[i]
            const [, targetId] = nodeEntries[j]

            // Ensure consistent ordering (smaller UUID first) to avoid duplicates
            const [sId, tId] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId]

            const { data: existingEdge } = await supabase
                .from('tg_edges')
                .select('id, weight')
                .eq('collector_id', collectorId)
                .eq('source_node_id', sId)
                .eq('target_node_id', tId)
                .single()

            if (existingEdge) {
                await supabase
                    .from('tg_edges')
                    .update({
                        weight: existingEdge.weight + 1,
                        last_seen_at: new Date().toISOString(),
                    })
                    .eq('id', existingEdge.id)
            } else {
                await supabase.from('tg_edges').insert({
                    collector_id: collectorId,
                    source_node_id: sId,
                    target_node_id: tId,
                })
            }
            edgesProcessed++
        }
    }

    // 4. Create a snapshot for timeline tracking
    const { count: nodeCount } = await supabase
        .from('tg_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('collector_id', collectorId)

    const { count: edgeCount } = await supabase
        .from('tg_edges')
        .select('*', { count: 'exact', head: true })
        .eq('collector_id', collectorId)

    const { data: avgData } = await supabase
        .from('tg_nodes')
        .select('occurrence_count')
        .eq('collector_id', collectorId)

    const avgOccurrence = avgData && avgData.length > 0
        ? avgData.reduce((sum, n) => sum + n.occurrence_count, 0) / avgData.length
        : 0

    await supabase.from('tg_snapshots').insert({
        collector_id: collectorId,
        node_count: nodeCount ?? 0,
        edge_count: edgeCount ?? 0,
        anomaly_count: 0, // Updated async by analytics
        avg_occurrence: Math.round(avgOccurrence * 100) / 100,
    })

    return { nodesProcessed: nodeIds.size, edgesProcessed }
}

// ─── Graph Data Retrieval ───────────────────────────────────────

function getTimeRangeDate(range: string): Date {
    const now = new Date()
    switch (range) {
        case '1h': return new Date(now.getTime() - 1 * 60 * 60 * 1000)
        case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000)
        case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000)
        case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        default: return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
}

/**
 * Fetch graph nodes and edges for visualization.
 */
export async function getTemporalGraphData(
    range: string = '24h',
    collectorId?: string
): Promise<GraphData> {
    const supabase = createAdminClient()
    const since = getTimeRangeDate(range).toISOString()

    // Fetch nodes active within the time range
    let nodesQuery = supabase
        .from('tg_nodes')
        .select('*')
        .gte('last_seen_at', since)
        .order('occurrence_count', { ascending: false })
        .limit(150) // Cap for visualization performance

    if (collectorId) {
        nodesQuery = nodesQuery.eq('collector_id', collectorId)
    }

    const { data: nodes } = await nodesQuery

    if (!nodes || nodes.length === 0) {
        return { nodes: [], edges: [] }
    }

    const nodeIdSet = new Set(nodes.map((n) => n.id))

    // Fetch edges between visible nodes
    let edgesQuery = supabase
        .from('tg_edges')
        .select('*')
        .gte('last_seen_at', since)
        .order('weight', { ascending: false })
        .limit(300)

    if (collectorId) {
        edgesQuery = edgesQuery.eq('collector_id', collectorId)
    }

    const { data: edges } = await edgesQuery

    // Filter edges to only those connecting visible nodes
    const filteredEdges = (edges || []).filter(
        (e) => nodeIdSet.has(e.source_node_id) && nodeIdSet.has(e.target_node_id)
    )

    return { nodes: nodes as TGNode[], edges: filteredEdges as TGEdge[] }
}

// ─── Analytics ──────────────────────────────────────────────────

/**
 * Compute analytics: anomalies, trends, hubs, and timeline.
 */
export async function getGraphAnalytics(
    range: string = '24h',
    collectorId?: string
): Promise<GraphAnalytics> {
    const supabase = createAdminClient()
    const since = getTimeRangeDate(range).toISOString()

    // ── Fetch all nodes for analytics ──
    let nodesQuery = supabase
        .from('tg_nodes')
        .select('*')
        .order('occurrence_count', { ascending: false })

    if (collectorId) {
        nodesQuery = nodesQuery.eq('collector_id', collectorId)
    }

    const { data: allNodes } = await nodesQuery
    const nodes = (allNodes || []) as TGNode[]

    // ── Fetch edges ──
    let edgesQuery = supabase
        .from('tg_edges')
        .select('*')

    if (collectorId) {
        edgesQuery = edgesQuery.eq('collector_id', collectorId)
    }

    const { data: allEdges } = await edgesQuery
    const edges = (allEdges || []) as TGEdge[]

    // ── Fetch snapshots for timeline ──
    let snapshotsQuery = supabase
        .from('tg_snapshots')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true })

    if (collectorId) {
        snapshotsQuery = snapshotsQuery.eq('collector_id', collectorId)
    }

    const { data: snapshots } = await snapshotsQuery
    const timeline = (snapshots || []) as TGSnapshot[]

    // ── Anomaly Detection ──
    // Compute mean and standard deviation of occurrence counts
    const anomalies: AnomalyResult[] = []

    if (nodes.length > 0) {
        const occurrences = nodes.map((n) => n.occurrence_count)
        const mean = occurrences.reduce((a, b) => a + b, 0) / occurrences.length
        const variance = occurrences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / occurrences.length
        const stdDev = Math.sqrt(variance)

        for (const node of nodes) {
            const deviation = stdDev > 0 ? (node.occurrence_count - mean) / stdDev : 0

            // New entities (seen recently for the first time)
            const firstSeen = new Date(node.first_seen_at)
            const sinceDate = getTimeRangeDate(range)
            if (firstSeen >= sinceDate && node.occurrence_count === 1) {
                anomalies.push({
                    node,
                    severity: 'low',
                    type: 'new_entity',
                    description: `New entity "${node.entity_value || node.entity_key}" appeared for the first time`,
                    deviation: 0,
                })
                continue
            }

            // Spike: occurrence count > 2σ above mean
            if (deviation > 2) {
                const severity = deviation > 4 ? 'critical' : deviation > 3 ? 'high' : 'medium'
                anomalies.push({
                    node,
                    severity,
                    type: 'spike',
                    description: `"${node.entity_value || node.entity_key}" occurrence spiked ${deviation.toFixed(1)}σ above average`,
                    deviation,
                })
            }
        }

        // Sort by severity
        const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
        anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    }

    // ── Hub Detection ──
    // Nodes with highest edge degree (most connections)
    const degreeMap: Record<string, number> = {}
    for (const edge of edges) {
        degreeMap[edge.source_node_id] = (degreeMap[edge.source_node_id] || 0) + 1
        degreeMap[edge.target_node_id] = (degreeMap[edge.target_node_id] || 0) + 1
    }

    const hubs = nodes
        .map((n) => ({ ...n, degree: degreeMap[n.id] || 0 }))
        .filter((n) => n.degree > 0)
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 10)

    // ── Trend Analysis ──
    // Compare occurrence rate based on when entities were first/last seen
    const trends: TrendResult[] = nodes
        .filter((n) => n.occurrence_count > 1)
        .map((n) => {
            const lifespan = new Date(n.last_seen_at).getTime() - new Date(n.first_seen_at).getTime()
            const lifespanHours = Math.max(lifespan / (1000 * 60 * 60), 1)
            const changeRate = n.occurrence_count / lifespanHours

            // Build a simple sparkline from snapshots for this collector
            const collectorSnapshots = timeline.filter((s) => s.collector_id === n.collector_id)
            const sparkline = collectorSnapshots.map((s) => s.node_count)

            return {
                node: n,
                direction: changeRate > 1 ? 'rising' as const : changeRate < 0.1 ? 'declining' as const : 'stable' as const,
                changeRate: Math.round(changeRate * 100) / 100,
                sparkline,
            }
        })
        .sort((a, b) => b.changeRate - a.changeRate)
        .slice(0, 20)

    // ── Stats ──
    const recentNodes = nodes.filter((n) => new Date(n.last_seen_at) >= getTimeRangeDate(range))
    const lastUpdated = nodes.length > 0
        ? nodes.reduce((latest, n) => n.last_seen_at > latest ? n.last_seen_at : latest, nodes[0].last_seen_at)
        : null

    return {
        anomalies: anomalies.slice(0, 50),
        trends,
        hubs,
        timeline,
        stats: {
            totalNodes: recentNodes.length,
            totalEdges: edges.filter((e) => new Date(e.last_seen_at) >= getTimeRangeDate(range)).length,
            anomalyCount: anomalies.length,
            lastUpdated,
        },
    }
}
