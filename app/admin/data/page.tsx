import { createAdminClient } from '@/lib/supabase/admin'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { ExportButton } from './ExportButton'

export const dynamic = 'force-dynamic'

export default async function DataViewerPage() {
    const supabase = createAdminClient()

    // Fetch data with a join on collectors to get the friendly name
    const { data: scrapedData } = await supabase
        .from('scraped_data')
        .select(`
      id,
      created_at,
      extracted_data,
      collectors (
        name
      )
    `)
        .order('created_at', { ascending: false })
        .limit(100) // Render up to 100 recent payload chunks for the dashboard preview

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Scraped Data</h2>
                    <p className="text-neutral-400 mt-2">
                        View recent payload telemetry extracted from your targets.
                    </p>
                </div>

                {/* Pass ONLY the raw data down to the Client Component for PapaParse CSV Export */}
                <ExportButton data={scrapedData || []} />
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
                <Table>
                    <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                            <TableHead className="text-neutral-400">Timestamp</TableHead>
                            <TableHead className="text-neutral-400">Collector</TableHead>
                            <TableHead className="text-neutral-400">Items Count</TableHead>
                            <TableHead className="text-neutral-400">Data Preview</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!scrapedData || scrapedData.length === 0) ? (
                            <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                                <TableCell colSpan={4} className="text-center h-24 text-neutral-500">
                                    No data extracted yet. Run a collector to generate baseline data.
                                </TableCell>
                            </TableRow>
                        ) : (
                            scrapedData.map((row) => {
                                const results = row.extracted_data?.results || []
                                const count = Array.isArray(results) ? results.length : 0
                                const rawPreview = count > 0 ? (typeof results[0] === 'string' ? results[0] : JSON.stringify(results[0])) : ''
                                const preview = rawPreview ? rawPreview.substring(0, 80) + (rawPreview.length > 80 ? '...' : '') : 'Empty Payload'

                                return (
                                    <TableRow key={row.id} className="border-neutral-800 hover:bg-neutral-800/50">
                                        <TableCell className="text-neutral-400 text-sm whitespace-nowrap">
                                            {new Date(row.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-medium text-white max-w-[200px] truncate">
                                            {(row.collectors as unknown as { name: string })?.name || 'Deleted Collector'}
                                        </TableCell>
                                        <TableCell>
                                            <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded text-xs font-mono">
                                                {count} items
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-neutral-300 font-mono text-xs max-w-[300px] truncate" title={preview}>
                                            {preview}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
            {scrapedData && scrapedData.length === 100 && (
                <p className="text-xs text-neutral-500 text-center mt-4">Showing most recent 100 extraction payloads.</p>
            )}
        </div>
    )
}
