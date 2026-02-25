import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCollector } from '@/lib/scraper'

export const dynamic = 'force-dynamic'

// Maximum time Next.js will allow this route to run (5 minutes)
export const maxDuration = 300

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

    // 2. Fetch all active collectors
    const supabase = createAdminClient()

    const { data: collectors, error } = await supabase
        .from('collectors')
        .select('*')
        .eq('is_active', true)

    if (error) {
        console.error('[cron] Failed to fetch collectors:', error)
        return NextResponse.json(
            { error: 'Failed to fetch collectors', details: error.message },
            { status: 500 }
        )
    }

    if (!collectors || collectors.length === 0) {
        console.log('[cron] No active collectors found')
        return NextResponse.json({
            message: 'No active collectors found',
            completed_at: new Date().toISOString(),
        })
    }

    console.log(`[cron] Starting ${collectors.length} collectors...`)

    // 3. Run collectors sequentially (await each one — no fire-and-forget)
    const results: { name: string; success: boolean; count?: number; error?: string }[] = []

    for (const collector of collectors) {
        try {
            console.log(`[cron] Running: ${collector.name}`)
            const result = await runCollector(collector)
            if (result.success) {
                console.log(`[cron] ✓ ${collector.name} — ${result.count} items`)
                results.push({ name: collector.name, success: true, count: result.count })
            } else {
                console.error(`[cron] ✗ ${collector.name} — ${result.error}`)
                results.push({ name: collector.name, success: false, error: result.error })
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error(`[cron] ✗ ${collector.name} — exception:`, err)
            results.push({ name: collector.name, success: false, error: errMsg })
        }
    }

    console.log('[cron] All collectors finished')

    // 4. Return actual results
    const successCount = results.filter(r => r.success).length
    return NextResponse.json({
        message: `Completed ${successCount}/${results.length} collectors successfully`,
        completed_at: new Date().toISOString(),
        results,
    })
}
