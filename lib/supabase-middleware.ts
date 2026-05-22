import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createMiddlewareClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookie setting failed silently in middleware
          }
        },
      },
    }
  );
}

export async function getSession() {
  try {
    const supabase = await createMiddlewareClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

export async function getUserRole(userId: string) {
  try {
    const supabase = await createMiddlewareClient();
    const { data: user } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single();
    return user?.role || null;
  } catch {
    return null;
  }
}
