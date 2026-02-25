'use client'

import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'
import { clearLogs } from './actions'

export function ClearLogsButton() {
    const handleClear = async () => {
        if (!window.confirm('Clear all diagnostic logs? This action cannot be undone.')) {
            return
        }
        await clearLogs()
    }

    return (
        <Button
            onClick={handleClear}
            variant="destructive"
            className="bg-red-600/10 text-red-500 hover:bg-red-600/20 border-0"
        >
            <Trash className="w-4 h-4 mr-2" />
            Clear Diagnostics
        </Button>
    )
}
