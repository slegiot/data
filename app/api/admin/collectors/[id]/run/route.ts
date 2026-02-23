import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { runCollector } from '@/lib/scraper'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Defense in Depth: Explicitly verify strict ADMIN_UUID auth
        const cookieStore = cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                },
            }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user || user.id !== process.env.ADMIN_UUID) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Auth succeeded. Use Admin Client to bypass RLS for data fetching.
        const adminSupabase = createAdminClient()
        const collectorId = params.id

        // Fetch Collector configuration
        const { data: collector, error: fetchError } = await adminSupabase
            .from('collectors')
            .select('*')
            .eq('id', collectorId)
            .single()

        if (fetchError || !collector) {
            return NextResponse.json(
                { error: 'Collector not found' },
                { status: 404 }
            )
        }

        // Trigger Scrape Job
        const result = await runCollector(collector)

        if (!result.success) {
            return NextResponse.json(
                { error: 'Scraping failed', details: result.error },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: 'Scrape job completed successfully',
            result,
        })
    } catch (err: unknown) {
        console.error('API Error:', err)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
