import * as cheerio from 'cheerio'
import { createAdminClient } from '@/lib/supabase/admin'

export interface Collector {
    id: string
    target_url: string
    css_selector: string
}

export async function runCollector(collector: Collector) {
    const supabase = createAdminClient()
    const { id: collector_id, target_url, css_selector } = collector

    try {
        // 1. Fetch HTML
        const response = await fetch(target_url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch target URL: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()

        // 2. Parse and Extract
        const $ = cheerio.load(html)
        const results: string[] = []

        $(css_selector).each((_, element) => {
            const text = $(element).text().trim()
            if (text) {
                results.push(text)
            }
        })

        const extractedData = { results }

        // 3. Save Payload
        const { error: dataError } = await supabase
            .from('scraped_data')
            .insert([
                {
                    collector_id,
                    extracted_data: extractedData,
                },
            ])

        if (dataError) throw dataError

        // 4. Log Success
        await supabase.from('logs').insert([
            {
                collector_id,
                status: 'success',
                message: `Extracted ${results.length} items.`,
            },
        ])

        return { success: true, count: results.length }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        // Record Error
        console.error(`Collector [${collector_id}] Error:`, error)

        await supabase.from('logs').insert([
            {
                collector_id,
                status: 'error',
                message: errMsg || 'Unknown error occurred during scraping',
            },
        ])

        return { success: false, error: errMsg }
    }
}
