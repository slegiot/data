import { Page, BrowserContext } from 'playwright-core'

/**
 * Stealth Evasion Module
 * 
 * Injects anti-detection scripts into the browser context to bypass
 * bot-detection systems (Cloudflare, DataDome, PerimeterX, etc).
 * These patches make the remote Chromium instance appear as a
 * genuine human-operated browser.
 */

// Collection of init scripts that patch known automation fingerprints
const STEALTH_SCRIPTS: string[] = [
    // 1. Hide navigator.webdriver flag
    `Object.defineProperty(navigator, 'webdriver', { get: () => false });`,

    // 2. Override Permissions API to mimic real Chrome behavior
    `const originalQuery = window.navigator.permissions.query;
   window.navigator.permissions.query = (parameters) =>
     parameters.name === 'notifications'
       ? Promise.resolve({ state: Notification.permission })
       : originalQuery(parameters);`,

    // 3. Fake plugins array (real Chrome always has at least 3)
    `Object.defineProperty(navigator, 'plugins', {
     get: () => [
       { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
       { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
       { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
     ]
   });`,

    // 4. Fake languages to appear as a real user
    `Object.defineProperty(navigator, 'languages', {
     get: () => ['en-US', 'en', 'de']
   });`,

    // 5. Hide Chrome automation runtime flags
    `window.chrome = {
     runtime: {},
     loadTimes: function() {},
     csi: function() {},
     app: { isInstalled: false }
   };`,

    // 6. Pass WebGL renderer check (bot detectors inspect GPU details)
    `const getParameter = WebGLRenderingContext.prototype.getParameter;
   WebGLRenderingContext.prototype.getParameter = function(parameter) {
     if (parameter === 37445) return 'Intel Inc.';
     if (parameter === 37446) return 'Intel Iris OpenGL Engine';
     return getParameter.call(this, parameter);
   };`,

    // 7. Spoof connection type to appear as a real broadband user
    `Object.defineProperty(navigator, 'connection', {
     get: () => ({
       effectiveType: '4g',
       rtt: 50,
       downlink: 10,
       saveData: false
     })
   });`,

    // 8. Override iframe contentWindow detection
    `const originalAttachShadow = Element.prototype.attachShadow;
   Element.prototype.attachShadow = function() {
     return originalAttachShadow.call(this, ...arguments);
   };`,
]

/**
 * Apply all stealth patches to a browser context.
 * Must be called BEFORE navigating to any page.
 */
export async function applyStealthToContext(context: BrowserContext): Promise<void> {
    for (const script of STEALTH_SCRIPTS) {
        await context.addInitScript(script)
    }
}

/**
 * Simulate human-like behavior on a page. 
 * Call after page.goto() to add natural delays and mouse movements.
 */
export async function simulateHumanBehavior(page: Page): Promise<void> {
    // Random delay between 800ms and 2500ms (humans don't act instantly)
    const delay = Math.floor(Math.random() * 1700) + 800
    await page.waitForTimeout(delay)

    // Simulate a gentle mouse movement to a random viewport position
    const viewport = page.viewportSize()
    if (viewport) {
        const x = Math.floor(Math.random() * viewport.width * 0.8) + 50
        const y = Math.floor(Math.random() * viewport.height * 0.5) + 100
        await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5) + 3 })
    }

    // Another small natural pause
    await page.waitForTimeout(Math.floor(Math.random() * 500) + 200)
}

/**
 * Generate a randomized viewport size to avoid fingerprinting.
 * Real users have varying screen resolutions.
 */
export function getRandomViewport(): { width: number; height: number } {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1366, height: 768 },
        { width: 1280, height: 720 },
        { width: 1680, height: 1050 },
    ]
    return viewports[Math.floor(Math.random() * viewports.length)]
}

/**
 * Pool of realistic User-Agent strings to rotate through.
 */
export function getRandomUserAgent(): string {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ]
    return agents[Math.floor(Math.random() * agents.length)]
}
