'use server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

type VerifyResult =
  | { success: true }
  | { success: false; error: string };

export async function verifyStudentAccess(phone: string): Promise<VerifyResult> {
  // Sanitize & validate phone: exactly 10 digits
  const sanitized = phone.replace(/\D/g, '');

  if (sanitized.length !== 10) {
    return { success: false, error: 'Please enter exactly 10 digits.' };
  }

  // Verify student exists in database
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

  // Create temporary auth user for student access
  try {
    const supabase = await createServerClient();

    const demoEmail = `${sanitized}@student.local`;
    const demoPassword = sanitized;

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    // If user doesn't exist, create one
    if (signInError?.message?.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
      });

      if (signUpError) {
        return { success: false, error: 'Failed to create session' };
      }
    } else if (signInError) {
      return { success: false, error: 'Authentication failed' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Session creation failed' };
  }
}
