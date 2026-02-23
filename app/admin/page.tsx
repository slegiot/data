import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Database, AlertCircle } from 'lucide-react'
import { VolumeChart } from './VolumeChart'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
    const supabase = createAdminClient()

    // 1. Fetch Total Active Collectors
    const { count: activeCount } = await supabase
        .from('collectors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

    // 2. Fetch Total Scraped Rows
    const { count: dataCount } = await supabase
        .from('scraped_data')
        .select('*', { count: 'exact', head: true })

    // 3. Fetch Recent Errors (Last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: errorCount } = await supabase
        .from('logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error')
        .gte('created_at', twentyFourHoursAgo)

    // 4. Fetch volume chart data (scrapes per day for last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentScrapes } = await supabase
        .from('scraped_data')
        .select('created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })

    // Aggregate scrapes by day
    const dailyCounts: Record<string, number> = {}

    // Pre-fill the last 7 days with 0 so the chart looks complete even if empty
    for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dailyCounts[dateStr] = 0
    }

    recentScrapes?.forEach((row) => {
        const d = new Date(row.created_at)
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (dailyCounts[dateStr] !== undefined) {
            dailyCounts[dateStr]++
        }
    })

    const chartData = Object.keys(dailyCounts).map((date) => ({
        name: date,
        volume: dailyCounts[date],
    }))

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
