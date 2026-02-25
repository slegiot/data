'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedAdminClient } from '@/lib/supabase/auth'

export async function clearLogs() {
    const supabase = await getAuthenticatedAdminClient()

    // Delete all logs — use a condition that matches every UUID
    const { error } = await supabase
        .from('logs')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00Z')

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/logs')
    return { success: true }
}
