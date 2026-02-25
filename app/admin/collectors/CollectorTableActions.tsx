'use client'

import { useState } from 'react'
import { Play, Trash2, Power, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteCollector, toggleCollectorActive } from './actions'
import { useToast } from '@/hooks/use-toast'

interface CollectorActionsProps {
    collector: {
        id: string
        is_active: boolean
        name: string
    }
}

export function CollectorTableActions({ collector }: CollectorActionsProps) {
    const [isRunning, setIsRunning] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isToggling, setIsToggling] = useState(false)
    const { toast } = useToast()

    const handleRun = async () => {
        setIsRunning(true)
        try {
            const response = await fetch(`/api/admin/collectors/${collector.id}/run`, {
                method: 'POST',
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to run collector')
            }

            toast({
                title: 'Success',
                description: `Successfully executed ${collector.name}. Scraped ${data.result.count} items.`,
            })
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            toast({
                variant: 'destructive',
                title: 'Execution Failed',
                description: errMsg,
            })
        } finally {
            setIsRunning(false)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${collector.name}"? This will also remove all associated data and logs.`)) {
            return
        }
        setIsDeleting(true)
        const result = await deleteCollector(collector.id)
        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error,
            })
        } else {
            toast({
                title: 'Deleted',
                description: 'Collector removed successfully.',
            })
        }
        setIsDeleting(false)
    }

    const handleToggle = async () => {
        setIsToggling(true)
        const result = await toggleCollectorActive(collector.id, collector.is_active)
        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error,
            })
        }
        setIsToggling(false)
    }

    return (
        <div className="flex items-center gap-2 justify-end">
            <Button
                variant="outline"
                size="sm"
                onClick={handleToggle}
                disabled={isToggling}
                className={collector.is_active ? 'text-green-500' : 'text-neutral-500'}
                title={collector.is_active ? 'Disable' : 'Enable'}
            >
                <Power className="w-4 h-4" />
            </Button>

            <Button
                variant="default"
                size="sm"
                onClick={handleRun}
                disabled={isRunning}
                className="bg-orange-600 hover:bg-orange-500 text-white"
                title="Run Now"
            >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>

            <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete"
            >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
        </div>
    )
}
