'use server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function getStudentSession() {
  console.log('[DASHBOARD ACTIONS] getStudentSession called, DEMO_MODE:', process.env.DEMO_MODE);

  // Demo mode - always return mock session
  if (process.env.DEMO_MODE === 'true') {
    const cookieStore = await cookies();
    const studentPhone = cookieStore.get('student_phone')?.value || '1234567890';

    console.log('[DEMO MODE] Returning mock session for phone:', studentPhone);

    return {
      user: {
        id: 'demo-student-001',
        phone: studentPhone,
        email: null,
        user_metadata: {},
      },
      access_token: 'demo-token',
    } as any;
  }

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
  // Demo/test mode - return demo student
  if (process.env.DEMO_MODE === 'true') {
    console.log('[DEMO MODE] Returning mock student data for phone:', phone);

    return {
      id: 1001,
      name: 'Demo Student',
      phone: phone,
      email: 'demo@student.local',
      target_exam: 'NEET',
      speed_limit: '10 Mbps',
      address: 'Test Address, City',
      created_at: new Date().toISOString(),
    };
  }

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
  // Demo/test mode - return sample attendance
  if (process.env.DEMO_MODE === 'true') {
    const demoRecords = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= Math.min(daysInMonth, 20); day++) {
      if (day % 3 !== 0) { // Simulate some absences
        demoRecords.push({
          id: day,
          'attendance-date': `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          check_in: true,
          created_at: new Date().toISOString(),
        });
      }
    }
    return demoRecords;
  }

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
    return [];
  }

  return records || [];
}

export async function markAttendanceToday(studentId: number) {
  // Demo/test mode - simulate success
  if (process.env.DEMO_MODE === 'true') {
    return { success: true, data: [{ id: 999, student_id: studentId, check_in: true }] };
  }

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
    return { success: false, error: 'Failed to mark attendance. Please try again.' };
  }

  return { success: true, data };
}

export async function hasMarkedAttendanceToday(studentId: number): Promise<boolean> {
  // Demo/test mode - return false to allow marking
  if (process.env.DEMO_MODE === 'true') {
    return false;
  }

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
