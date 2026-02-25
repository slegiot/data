'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from './admin'

/**
 * Shared authentication helper for server actions & API routes.
 * 
 * 1. Verifies the caller is the admin user via cookie-based auth session
 * 2. Returns an admin-privileged Supabase client that bypasses RLS for writes
 * 
 * Throws if the user is not authenticated or not the admin.
 */
export async function getAuthenticatedAdminClient() {
    const cookieStore = await cookies()

    // Use anon key client ONLY to verify the user's identity
    const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: Record<string, unknown>) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {
                        // Called from Server Component — middleware handles refresh
                    }
                },
                remove(name: string, options: Record<string, unknown>) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {
                        // Called from Server Component — middleware handles refresh
                    }
                },
            },
        }
    )

    const { data: { user } } = await authClient.auth.getUser()
    if (!user || user.id !== process.env.ADMIN_UUID) {
        throw new Error('Unauthorized')
    }

    // Return the service-role client for actual data operations (bypasses RLS)
    return createAdminClient()
}
