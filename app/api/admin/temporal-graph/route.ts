import { NextResponse } from 'next/server'
import { getTemporalGraphData, getGraphAnalytics } from '@/lib/temporal-graph'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/temporal-graph
 * 
 * Query params:
 *   - range: '1h' | '6h' | '24h' | '7d' | '30d' (default: '24h')
 *   - collector_id: optional UUID to filter by collector
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '24h'
        const collectorId = searchParams.get('collector_id') || undefined

        // Validate range
        const validRanges = ['1h', '6h', '24h', '7d', '30d']
        if (!validRanges.includes(range)) {
            return NextResponse.json(
                { error: `Invalid range. Must be one of: ${validRanges.join(', ')}` },
                { status: 400 }
            )
        }

        // Fetch graph data and analytics in parallel
        const [graphData, analytics] = await Promise.all([
            getTemporalGraphData(range, collectorId),
            getGraphAnalytics(range, collectorId),
        ])

        return NextResponse.json({
            graph: graphData,
            analytics,
            meta: {
                range,
                collectorId: collectorId || null,
                generatedAt: new Date().toISOString(),
            },
        })
    } catch (error) {
        console.error('[temporal-graph] API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch temporal graph data' },
            { status: 500 }
        )
    }
}
