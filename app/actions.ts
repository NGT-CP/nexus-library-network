'use server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

type VerifyResult =
  | { success: true }
  | { success: false; error: string };

export async function verifyStudentAccess(phone: string): Promise<VerifyResult> {
  // Sanitize & validate phone: exactly 10 digits
  const sanitized = phone.replace(/\D/g, '');
  console.log('[LOGIN] Sanitized phone:', sanitized);

  if (sanitized.length !== 10) {
    return { success: false, error: 'Please enter exactly 10 digits.' };
  }

  // Demo mode - create a temporary auth session
  if (process.env.DEMO_MODE === 'true') {
    console.log('[DEMO MODE] Creating temp auth session for phone:', sanitized);

    try {
      const supabase = await createServerClient();

      // For demo: create a temp user with phone as identifier
      // Using email format: phone@demo.local
      const demoEmail = `${sanitized}@demo.local`;
      const demoPassword = sanitized; // Use phone as password for demo

      // Try to sign up or sign in
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
      });

      // If user already exists, sign in
      if (signUpError?.message?.includes('User already registered')) {
        console.log('[DEMO MODE] User exists, signing in...');
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: demoPassword,
          });

        if (signInError) {
          console.error('[DEMO MODE] Sign in error:', signInError);
          return { success: false, error: 'Failed to create session' };
        }

        console.log('[DEMO MODE] Successfully signed in, session:', signInData.session?.user?.id);
        return { success: true };
      }

      if (signUpError) {
        console.error('[DEMO MODE] Sign up error:', signUpError);
        return { success: false, error: 'Failed to create session' };
      }

      console.log('[DEMO MODE] Successfully created account and session');
      return { success: true };
    } catch (error) {
      console.error('[DEMO MODE] Error:', error);
      return { success: false, error: 'Demo mode error' };
    }
  }

  // Production mode: verify student exists in database
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('is_blocked')
    .eq('phone', sanitized)
    .single();

  if (error || !student) {
    return { success: false, error: 'Number not registered. Please see the admin.' };
  }

  if (student.is_blocked) {
    return { success: false, error: 'Access denied. Please contact the admin.' };
  }

  // For production: would need to implement phone-based auth or OTP flow
  // For now, return success and let the middleware handle it
  return { success: true };
}
