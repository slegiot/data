'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper to get authenticated client
async function getSupabase() {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== process.env.ADMIN_UUID) {
        throw new Error('Unauthorized')
    }

    return supabase
}

export async function clearLogs() {
    const supabase = await getSupabase()

    // Clear all logs using a dummy condition since we want to delete absolutely everything
    const { error } = await supabase.from('logs').delete().neq('id', 'clear-all-forced')

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/logs')
    return { success: true }
}
