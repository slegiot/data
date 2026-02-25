import Link from 'next/link'
import { Database, Shield, Clock, Zap, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Navigation */}
      <header className="border-b border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SilentCollector</span>
          </div>
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-medium rounded-lg bg-orange-600 hover:bg-orange-500 transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient orb background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial from-orange-500/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Automated Data Collection
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Collect web data
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              silently & reliably
            </span>
          </h1>

          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Schedule automated scraping jobs that run on a cron schedule, extract structured data from any website, and store everything in a searchable database. No manual intervention needed.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 active:scale-95"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Stealth Mode</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Anti-detection browser fingerprinting with randomized viewports, user agents, and human-like behavior simulation.
            </p>
          </div>

          <div className="group p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Scheduled Runs</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Cron-based scheduling runs your collectors automatically every hour. Monitor everything from the admin dashboard.
            </p>
          </div>

          <div className="group p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Structured Storage</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Extracted data is stored as structured JSON in Supabase with full export to CSV. Track collection history over time.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-neutral-500">
          <span>© {new Date().getFullYear()} SilentCollector</span>
          <Link href="/login" className="hover:text-neutral-300 transition-colors">
            Admin Access →
          </Link>
        </div>
      </footer>
    </div>
  )
}
