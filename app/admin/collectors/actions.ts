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

export async function createCollector(formData: FormData) {
    const supabase = await getSupabase()

    const name = formData.get('name') as string
    const target_url = formData.get('target_url') as string
    const css_selector = formData.get('css_selector') as string
    const is_active = formData.get('is_active') === 'on'

    const { error } = await supabase.from('collectors').insert([
        { name, target_url, css_selector, is_active }
    ])

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/collectors')
    return { success: true }
}

export async function deleteCollector(id: string) {
    const supabase = await getSupabase()

    const { error } = await supabase.from('collectors').delete().eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/collectors')
    return { success: true }
}

export async function toggleCollectorActive(id: string, currentStatus: boolean) {
    const supabase = await getSupabase()

    const { error } = await supabase
        .from('collectors')
        .update({ is_active: !currentStatus })
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/collectors')
    return { success: true }
}
