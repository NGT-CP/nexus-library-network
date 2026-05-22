'use server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

  // Demo mode - skip DB check
  if (process.env.DEMO_MODE === 'true') {
    console.log('[DEMO MODE] Demo mode enabled, setting cookie for phone:', sanitized);

    const cookieStore = await cookies();
    cookieStore.set('student_phone', sanitized, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7, // 7 days
    });

    console.log('[DEMO MODE] Cookie set successfully');
    return { success: true };
  }

  // We MUST use the Service Role Key here because the student isn't logged in yet,
  // and RLS would otherwise block them from reading the students table.
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

  // Store phone in cookie
  const cookieStore = await cookies();
  cookieStore.set('student_phone', sanitized, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400 * 7, // 7 days
  });

  return { success: true };
}
