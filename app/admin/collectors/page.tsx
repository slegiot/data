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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { createCollector } from './actions'
import { CollectorTableActions } from './CollectorTableActions'

export const dynamic = 'force-dynamic'

export default async function CollectorsPage() {
    const supabase = createAdminClient()

    const { data: collectors } = await supabase
        .from('collectors')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Collectors</h2>
                    <p className="text-neutral-400 mt-2">
                        Manage your headless scraping configurations.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-orange-600 hover:bg-orange-500 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            New Collector
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create Collector</DialogTitle>
                            <DialogDescription className="text-neutral-400">
                                Configure a new scraping endpoint. It will be immediately active.
                            </DialogDescription>
                        </DialogHeader>

                        <form action={async (formData) => {
                            'use server'
                            await createCollector(formData)
                        }} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Friendly Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. Hacker News Top Story"
                                    required
                                    className="bg-neutral-950 border-neutral-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target_url">Target URL</Label>
                                <Input
                                    id="target_url"
                                    name="target_url"
                                    type="url"
                                    placeholder="https://news.ycombinator.com"
                                    required
                                    className="bg-neutral-950 border-neutral-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="css_selector">Extraction Script (JS)</Label>
                                <textarea
                                    id="css_selector"
                                    name="css_selector"
                                    placeholder={`const rows = document.querySelectorAll("table tbody tr");\nconst results = [];\n// ... build results array\nreturn results;`}
                                    required
                                    rows={5}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm font-mono text-white placeholder-neutral-500 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    defaultChecked
                                    className="w-4 h-4 text-orange-600 rounded bg-neutral-950 border-neutral-800 focus:ring-orange-600 focus:ring-offset-neutral-900"
                                />
                                <Label htmlFor="is_active">Active via Cron</Label>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white">
                                    Save
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
                <Table>
                    <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                            <TableHead className="text-neutral-400">Name</TableHead>
                            <TableHead className="text-neutral-400">Target</TableHead>
                            <TableHead className="text-neutral-400">Script</TableHead>
                            <TableHead className="text-neutral-400">Status</TableHead>
                            <TableHead className="text-right text-neutral-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {collectors?.length === 0 ? (
                            <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                                <TableCell colSpan={5} className="text-center h-24 text-neutral-500">
                                    No collectors configured yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            collectors?.map((collector) => (
                                <TableRow key={collector.id} className="border-neutral-800 hover:bg-neutral-800/50">
                                    <TableCell className="font-medium text-white">
                                        {collector.name}
                                    </TableCell>
                                    <TableCell className="text-neutral-400 truncate max-w-[200px]" title={collector.target_url}>
                                        {collector.target_url}
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <span className="font-mono text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded truncate block" title={collector.css_selector}>
                                            {collector.css_selector.substring(0, 40)}{collector.css_selector.length > 40 ? '...' : ''}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {collector.is_active ? (
                                            <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border-0">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-neutral-800 text-neutral-400 border-0">
                                                Inactive
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <CollectorTableActions collector={collector} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
