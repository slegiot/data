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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'
import { clearLogs } from './actions'

export const dynamic = 'force-dynamic'

export default async function LogsViewerPage() {
    const supabase = createAdminClient()

    // Fetch data with a join on collectors to get the friendly name
    const { data: logs } = await supabase
        .from('logs')
        .select(`
      id,
      created_at,
      status,
      message,
      collectors (
        name
      )
    `)
        .order('created_at', { ascending: false })
        .limit(200)

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
                    <p className="text-neutral-400 mt-2">
                        Audit trailing and operational status tracking for all execution pipelines.
                    </p>
                </div>

                <form action={async () => {
                    'use server'
                    await clearLogs()
                }}
                    onSubmit={(e) => {
                        if (!window.confirm('Clear all diagnostic logs? This action cannot be undone.')) {
                            e.preventDefault()
                        }
                    }}
                >
                    <Button type="submit" variant="destructive" className="bg-red-600/10 text-red-500 hover:bg-red-600/20 border-0">
                        <Trash className="w-4 h-4 mr-2" />
                        Clear Diagnostics
                    </Button>
                </form>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
                <Table>
                    <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                            <TableHead className="text-neutral-400">Timestamp</TableHead>
                            <TableHead className="text-neutral-400">Status</TableHead>
                            <TableHead className="text-neutral-400">Collector</TableHead>
                            <TableHead className="text-neutral-400">Audit Message</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!logs || logs.length === 0) ? (
                            <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                                <TableCell colSpan={4} className="text-center h-24 text-neutral-500">
                                    No system logs available.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((row) => (
                                <TableRow key={row.id} className="border-neutral-800 hover:bg-neutral-800/50">
                                    <TableCell className="text-neutral-400 text-sm whitespace-nowrap">
                                        {new Date(row.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {row.status === 'success' ? (
                                            <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border-0">
                                                Success
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0">
                                                Failed
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-white max-w-[200px] truncate">
                                        {(row.collectors as unknown as { name: string })?.name || 'System Context'}
                                    </TableCell>
                                    <TableCell className="text-neutral-300 font-mono text-sm">
                                        {row.message}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {logs && logs.length === 200 && (
                <p className="text-xs text-neutral-500 text-center mt-4">Showing 200 most recent diagnostics tracking entries.</p>
            )}
        </div>
    )
}
