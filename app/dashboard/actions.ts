'use server';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function getStudentSession() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
    },
  };
}

export async function getStudentData(phone: string) {
  const supabase = await createServerClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('id, name, phone, email, target_exam, speed_limit, address, created_at')
    .eq('phone', phone)
    .single();

  if (error || !student) {
    return null;
  }

  return student;
}

export async function getAttendanceRecords(studentId: number, year: number, month: number) {
  const supabase = await createServerClient();

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data: records, error } = await supabase
    .from('attendance')
    .select('id, attendance-date, check_in, created_at')
    .gte('attendance-date', startDate)
    .lte('attendance-date', endDate)
    .order('attendance-date', { ascending: true });

  if (error) {
    return [];
  }

  return records || [];
}

export async function markAttendanceToday(studentId: number) {
  const supabase = await createServerClient();

  const today = new Date().toISOString().split('T')[0];

  // Check if already marked today
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance-date', today)
    .single();

  if (existing) {
    return { success: false, error: 'Already marked attendance today' };
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert([
      {
        student_id: studentId,
        'attendance-date': today,
        check_in: true,
        marked_by: 'SELF',
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    return { success: false, error: 'Failed to mark attendance. Please try again.' };
  }

  return { success: true, data };
}

export async function hasMarkedAttendanceToday(studentId: number): Promise<boolean> {
  const supabase = await createServerClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance-date', today)
    .single();

  return !!data && !error;
}

export async function getSubscriptionData(studentId: number) {
  const supabase = await createServerClient();

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, started_at, expires_at, payment_method, status')
    .eq('student_id', studentId);

  if (error) {
    console.error('Subscription fetch error:', error);
    return [];
  }

  console.log('Fetched subscriptions for student:', studentId, subscriptions);
  return subscriptions || [];
}
