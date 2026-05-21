'use server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export async function getStudentSession() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect('/');
  }

  return session;
}

export async function getStudentData(phone: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: student, error } = await supabaseAdmin
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
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data: records, error } = await supabaseAdmin
    .from('attendance')
    .select('id, attendance-date, check_in, created_at')
    .eq('student_id', studentId)
    .gte('attendance-date', startDate)
    .lte('attendance-date', endDate)
    .order('attendance-date', { ascending: true });

  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }

  return records || [];
}

export async function markAttendanceToday(studentId: number) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];

  // Check if already marked today
  const { data: existing } = await supabaseAdmin
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance-date', today)
    .single();

  if (existing) {
    return { success: false, error: 'Already marked attendance today' };
  }

  const { data, error } = await supabaseAdmin
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
    console.error('Error marking attendance:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function hasMarkedAttendanceToday(studentId: number): Promise<boolean> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance-date', today)
    .single();

  return !!data && !error;
}
