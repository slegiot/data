'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, List, Database, ScrollText, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Collectors', href: '/admin/collectors', icon: List },
        { name: 'Data', href: '/admin/data', icon: Database },
        { name: 'Logs', href: '/admin/logs', icon: ScrollText },
    ]

    return (
        <div className="flex bg-neutral-950 text-white min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 flex flex-col p-4">
                <div className="flex items-center space-x-2 px-2 py-4 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                        <LayoutDashboard className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">SilentCollector</span>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                    ? 'bg-orange-500/10 text-orange-400'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium text-sm">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="pt-4 mt-4 border-t border-neutral-800">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto">
                <div className="p-8 max-w-7xl mx-auto">{children}</div>
            </main>
            <Toaster />
        </div>
    )
}
