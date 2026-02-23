'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Papa from 'papaparse'
import { useToast } from '@/hooks/use-toast'

interface ExportButtonProps {
    data: Record<string, unknown>[]
}

export function ExportButton({ data }: ExportButtonProps) {
    const { toast } = useToast()

    const handleExport = () => {
        try {
            if (!data || data.length === 0) {
                toast({
                    title: 'Empty Data',
                    description: 'There is no data to export.',
                })
                return
            }

            // Flatten the nested JSON structure for CSV
            const flatData: Record<string, unknown>[] = []

            data.forEach((row: Record<string, unknown>) => {
                const collectorName = (row.collectors as { name?: string })?.name || 'Unknown Collector'
                const timestamp = new Date(row.created_at as string).toLocaleString()

                // Extract the results array from the JSONB column
                const results = (row.extracted_data as { results?: string[] })?.results || []

                if (!Array.isArray(results) || results.length === 0) {
                    // If no results array, just log the empty state
                    flatData.push({
                        'Collector': collectorName,
                        'Timestamp': timestamp,
                        'Extracted Value': '',
                    })
                    return
                }

                // Create a separate CSV row for EVERY extracted item in the array
                results.forEach((item: string) => {
                    flatData.push({
                        'Collector': collectorName,
                        'Timestamp': timestamp,
                        'Extracted Value': item,
                    })
                })
            })

            // Convert to CSV string using PapaParse
            const csv = Papa.unparse(flatData)

            // Create Blob and trigger native browser download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')

            link.setAttribute('href', url)
            link.setAttribute('download', `scraped_data_export_${new Date().getTime()}.csv`)

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast({
                title: 'Export Successful',
                description: `Downloaded ${flatData.length} total rows.`,
            })
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: errMsg || 'An error occurred while generating the CSV.',
            })
        }
    }

    return (
        <Button
            onClick={handleExport}
            variant="outline"
            className="border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800"
        >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
        </Button>
    )
}
