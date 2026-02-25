import { createAdminClient } from './supabase/admin'
import { chromium, Browser } from 'playwright-core'
import * as Sentry from '@sentry/nextjs'
import {
    applyStealthToContext,
    simulateHumanBehavior,
    getRandomViewport,
    getRandomUserAgent,
} from './stealth'

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

        // 2. Open Context with stealth configuration
        const viewport = getRandomViewport()
        const context = await browser.newContext({
            userAgent: getRandomUserAgent(),
            viewport,
            locale: 'en-US',
            timezoneId: 'America/New_York',
            // Disguise as real desktop with touch disabled
            hasTouch: false,
            isMobile: false,
            // Set standard screen dimensions
            screen: { width: viewport.width, height: viewport.height },
        })

        // 3. Inject stealth evasion scripts BEFORE navigating
        await applyStealthToContext(context)

        const page = await context.newPage()

        // 4. Navigate & Wait for SPA to render
        await page.goto(target_url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForLoadState('networkidle')

        // 5. Simulate human behavior to avoid detection
        await simulateHumanBehavior(page)

        // 6. Extract Data Dynamically
        // Treating css_selector as a raw JavaScript function body that returns a JSON object
        const extractedPayload = await page.evaluate((scriptBody) => {
            try {
                const func = new Function(scriptBody)
                return func()
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err)
                return { error: 'Evaluation failed inside browser', details: errorMessage }
            }
        }, css_selector)

        // Validate payload structure
        let results = extractedPayload
        if (!Array.isArray(extractedPayload) && typeof extractedPayload !== 'object') {
            results = [String(extractedPayload)]
        } else if (extractedPayload?.error) {
            throw new Error(extractedPayload.details || extractedPayload.error)
        }

        const formattedExtraction = { results: Array.isArray(results) ? results : [results] }

        // 7. Save Payload
        const { error: dataError } = await supabase
            .from('scraped_data')
            .insert([
                {
                    collector_id,
                    extracted_data: formattedExtraction,
                },
            ])

        if (dataError) throw dataError

        // 8. Log Success
        await supabase.from('logs').insert([
            {
                collector_id,
                status: 'success',
                message: `Extracted data via Stealth Playwright. ${formattedExtraction.results.length} items.`,
            },
        ])

        return { success: true, count: formattedExtraction.results.length || 1 }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error(`Collector [${collector_id}] Error:`, error)

        // Report to Sentry with collector context
        Sentry.captureException(error, {
            tags: { collector_id, collector_name: collector.name },
            extra: { target_url, css_selector: css_selector.substring(0, 200) },
        })

        await supabase.from('logs').insert([
            {
                collector_id,
                status: 'error',
                message: errMsg || 'Unknown error occurred during remote scraping',
            },
        ])

        return { success: false, error: errMsg }
    } finally {
        // ALWAYS cleanly disconnect from the remote Chromium provider
        if (browser) {
            await browser.close().catch(console.error)
        }
    }
}
