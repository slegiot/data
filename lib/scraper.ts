import { createAdminClient } from './supabase/admin'
import { chromium, Browser } from 'playwright-core'

export interface Collector {
    id: string
    name: string
    target_url: string
    css_selector: string
    is_active: boolean
    created_at?: string
    updated_at?: string
}

export async function runCollector(collector: Collector) {
    const supabase = createAdminClient()
    const { id: collector_id, target_url, css_selector } = collector

    let browser: Browser | null = null

    try {
        if (!process.env.BROWSERLESS_WSS_URL) {
            throw new Error('BROWSERLESS_WSS_URL is not defined in the environment')
        }

        // 1. Connect to Remote Browser via CDP
        browser = await chromium.connectOverCDP(process.env.BROWSERLESS_WSS_URL)

        // 2. Open Context and Page
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        const page = await context.newPage()

        // 3. Navigate & Wait for SPA to render
        await page.goto(target_url, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle')

        // 4. Extract Data Dynamically
        // Treating css_selector as a raw JavaScript function body that returns a JSON object
        const extractedPayload = await page.evaluate((scriptBody) => {
            try {
                // We wrap the script body in a self-executing function to capture its return value
                const func = new Function(scriptBody)
                return func()
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                return { error: 'Evaluation failed inside browser', details: errorMessage }
            }
        }, css_selector)

        // Validate payload structure simply
        let results = extractedPayload
        if (!Array.isArray(extractedPayload) && typeof extractedPayload !== 'object') {
            results = [String(extractedPayload)]
        } else if (extractedPayload?.error) {
            throw new Error(extractedPayload.details || extractedPayload.error)
        }

        const formattedExtraction = { results: Array.isArray(results) ? results : [results] }

        // 5. Save Payload
        const { error: dataError } = await supabase
            .from('scraped_data')
            .insert([
                {
                    collector_id,
                    extracted_data: formattedExtraction,
                },
            ])

        if (dataError) throw dataError

        // 6. Log Success
        await supabase.from('logs').insert([
            {
                collector_id,
                status: 'success',
                message: `Extracted data using Playwright Remote Execution.`,
            },
        ])

        return { success: true, count: formattedExtraction.results.length || 1 }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        // Record Error
        console.error(`Collector [${collector_id}] Error:`, error)

        await supabase.from('logs').insert([
            {
                collector_id,
                status: 'error',
                message: errMsg || 'Unknown error occurred during remote scraping',
            },
        ])

        return { success: false, error: errMsg }
    } finally {
        // ALWAYS cleanly disconnect from the remote Chromium provider preventing memory leaks
        if (browser) {
            await browser.close().catch(console.error)
        }
    }
}
