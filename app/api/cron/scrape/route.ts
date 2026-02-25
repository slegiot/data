import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCollector } from '@/lib/scraper'

export const dynamic = 'force-dynamic'

// Maximum time Next.js will allow this route to run (5 minutes)
export const maxDuration = 300

/**
 * Background processor: runs all active collectors and logs results.
 * Executes asynchronously after the 202 response is sent.
 */
async function processCollectors() {
    const supabase = createAdminClient()

    const { data: collectors, error } = await supabase
        .from('collectors')
        .select('*')
        .eq('is_active', true)

    if (error) {
        console.error('[cron] Failed to fetch collectors:', error)
        return
    }

    if (!collectors || collectors.length === 0) {
        console.log('[cron] No active collectors found')
        return
    }

    console.log(`[cron] Starting ${collectors.length} collectors...`)

    // Run collectors sequentially to avoid overwhelming browserless
    for (const collector of collectors) {
        try {
            console.log(`[cron] Running: ${collector.name}`)
            const result = await runCollector(collector)
            if (result.success) {
                console.log(`[cron] ✓ ${collector.name} — ${result.count} items`)
            } else {
                console.error(`[cron] ✗ ${collector.name} — ${result.error}`)
            }
        } catch (err) {
            console.error(`[cron] ✗ ${collector.name} — exception:`, err)
        }
    }

    console.log('[cron] All collectors finished')
}

export async function GET(request: Request) {
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

    // 2. Fire-and-forget: start processing in the background
    processCollectors().catch((err) =>
        console.error('[cron] Background processing error:', err)
    )

    // 3. Respond immediately so the cron job doesn't timeout
    return NextResponse.json(
        {
            message: 'Scrape job accepted — processing in background',
            accepted_at: new Date().toISOString(),
        },
        { status: 202 }
    )
}

