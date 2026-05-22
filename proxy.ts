import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && (!session || error)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If accessing protected route with session, allow access
  if (isProtectedRoute && session) {
    return response;
  }

  // If logged-in user tries to access root, redirect to appropriate dashboard
  if (pathname === '/' && session) {
    // Check if it's an admin user by checking if auth method is email (admin)
    // or phone (student)
    const isAdminUser = session.user?.email ? true : false;

    if (isAdminUser) {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // All other cases - allow access
  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
