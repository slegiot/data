import { createAdminClient } from '@/lib/supabase/admin'
import { TemporalGraphClient } from './TemporalGraphClient'

export const dynamic = 'force-dynamic'

export default async function TemporalGraphPage() {
    const supabase = createAdminClient()

    // Fetch collectors for the filter dropdown
    const { data: collectors } = await supabase
        .from('collectors')
        .select('id, name')
        .order('name', { ascending: true })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Temporal Graph</h2>
                <p className="text-neutral-400 mt-2">
                    Real-time entity relationship analysis across your scraped data.
                    Track how entities emerge, evolve, and connect over time.
                </p>
            </div>

            <TemporalGraphClient collectors={collectors || []} />
        </div>
    )
}
