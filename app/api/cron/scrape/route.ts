import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCollector } from '@/lib/scraper'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        // 1. Verify Authorization Header
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret) {
            console.error('CRON_SECRET environment variable is missing')
            return NextResponse.json(
                { error: 'Server misconfiguration' },
                { status: 500 }
            )
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // 2. Fetch active collectors
        const supabase = createAdminClient()
        const { data: collectors, error } = await supabase
            .from('collectors')
            .select('*')
            .eq('is_active', true)

        if (error) {
            console.error('Failed to fetch active collectors:', error)
            return NextResponse.json(
                { error: 'Database query failed' },
                { status: 500 }
            )
        }

        if (!collectors || collectors.length === 0) {
            return NextResponse.json({
                message: 'No active collectors found',
                summary: { total: 0, successful: 0, failed: 0 }
            })
        }

        // 3. Execute all active collectors concurrently
        const results = await Promise.allSettled(
            collectors.map(collector => runCollector(collector))
        )

        // 4. Summarize Results
        let successful = 0
        let failed = 0
        const details: Record<string, unknown>[] = []

        results.forEach((promiseResult, index) => {
            const collectorId = collectors[index].id
            if (promiseResult.status === 'fulfilled') {
                const scrapeResult = promiseResult.value
                if (scrapeResult.success) {
                    successful++
                    details.push({ collector: collectorId, status: 'success', count: scrapeResult.count })
                } else {
                    failed++
                    details.push({ collector: collectorId, status: 'error', error: scrapeResult.error })
                }
            } else {
                failed++
                details.push({ collector: collectorId, status: 'exception', error: String(promiseResult.reason) })
            }
        })

        return NextResponse.json({
            message: 'Cron job execution completed',
            summary: {
                total: collectors.length,
                successful,
                failed,
            },
            details,
        })
    } catch (error) {
        console.error('Unexpected error in Cron Route:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
