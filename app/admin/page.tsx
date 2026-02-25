import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Database, AlertCircle } from 'lucide-react'
import { VolumeChart } from './VolumeChart'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
    const supabase = createAdminClient()

    // Run all queries in parallel for speed
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Build per-day count queries for the chart (avoids fetching all rows)
    const dayQueries = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date()
        dayStart.setHours(0, 0, 0, 0)
        dayStart.setDate(dayStart.getDate() - (6 - i))
        const dayEnd = new Date(dayStart)
        dayEnd.setDate(dayEnd.getDate() + 1)

        return supabase
            .from('scraped_data')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', dayEnd.toISOString())
            .then(({ count }) => ({
                name: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                volume: count ?? 0,
            }))
    })

    const [
        { count: activeCount },
        { count: dataCount },
        { count: errorCount },
        ...chartData
    ] = await Promise.all([
        supabase.from('collectors').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('scraped_data').select('*', { count: 'exact', head: true }),
        supabase.from('logs').select('*', { count: 'exact', head: true }).eq('status', 'error').gte('created_at', twentyFourHoursAgo),
        ...dayQueries,
    ])

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-neutral-400 mt-2">
                    Overview of your scraping operations and data volume.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Active Collectors */}
                <Card className="bg-neutral-900 border-neutral-800 text-white shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Active Collectors
                        </CardTitle>
                        <Activity className="w-5 h-5 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount ?? 0}</div>
                        <p className="text-xs text-green-400 mt-1">Currently monitoring targets</p>
                    </CardContent>
                </Card>

                {/* Total Data Pulled */}
                <Card className="bg-neutral-900 border-neutral-800 text-white shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Total Scraped Rows
                        </CardTitle>
                        <Database className="w-5 h-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dataCount ?? 0}</div>
                        <p className="text-xs text-neutral-500 mt-1">Lifetime rows extracted</p>
                    </CardContent>
                </Card>

                {/* Recent Errors */}
                <Card className="bg-neutral-900 border-neutral-800 text-white shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400">
                            Errors (24h)
                        </CardTitle>
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{errorCount ?? 0}</div>
                        <p className="text-xs text-neutral-500 mt-1">Pipeline failures needing attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Chart */}
            <Card className="bg-neutral-900 border-neutral-800 text-white shadow-md p-6">
                <h3 className="text-lg font-medium tracking-tight mb-6">Extraction Volume (7 Days)</h3>
                <div className="h-[350px] w-full">
                    <VolumeChart data={chartData} />
                </div>
            </Card>
        </div>
    )
}
