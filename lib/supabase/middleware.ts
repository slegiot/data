import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Fetch the user session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/admin')
    const isCronRoute = request.nextUrl.pathname.startsWith('/api/cron')

    // Explicitly allow cron routes
    if (isCronRoute) {
        return supabaseResponse
    }

    if (isAdminRoute) {
        // Strict UUID check
        const adminUuid = process.env.ADMIN_UUID

        if (!user || user.id !== adminUuid) {
            if (request.nextUrl.pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
            return NextResponse.redirect(redirectUrl)
        }
    }

    // If the user goes to /login while already logged in as admin, redirect them to /admin
    if (request.nextUrl.pathname === '/login' && user && user.id === process.env.ADMIN_UUID) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/admin'
        return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
}
