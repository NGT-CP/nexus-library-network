'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, getYear, getMonth } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { getAttendanceRecords, markAttendanceToday, hasMarkedAttendanceToday, getSubscriptionData, getStudentSession, getStudentData } from './actions';

export default function AttendanceCalendar() {
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [subscriptionDates, setSubscriptionDates] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedToday, setMarkedToday] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [message, setMessage] = useState('');
  const [studentId, setStudentId] = useState<number | null>(null);

  // Initialize student ID
  useEffect(() => {
    const fetchStudentId = async () => {
      const session = await getStudentSession();
      if (session && session.user.email) {
        // Extract phone from email (format: {phone}@student.local)
        const phone = session.user.email.replace('@student.local', '');
        console.log('Extracted phone from email:', phone);

        const student = await getStudentData(phone);
        if (student) {
          console.log('Student found:', student.id, student.name, student.phone);
          setStudentId(student.id);
        } else {
          console.error('No student found for phone:', phone);
        }
      } else {
        console.error('No email in session');
      }
    };
    fetchStudentId();
  }, []);

  // Fetch attendance data on month change
  useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      const year = getYear(selectedDate);
      const month = getMonth(selectedDate);

      try {
        const year = getYear(selectedDate);
        const month = getMonth(selectedDate);

        const [records, subscriptions] = await Promise.all([
          getAttendanceRecords(studentId, year, month),
          getSubscriptionData(studentId),
        ]);

        // Build attendance map
        const attendanceMap: Record<string, boolean> = {};
        records.forEach((record: any) => {
          const dateStr =
            record['attendance-date'] ||
            format(new Date(record.created_at), 'yyyy-MM-dd');
          attendanceMap[dateStr] = true;
        });
        setAttendanceData(attendanceMap);

        // Build subscription dates map
        const subDatesMap: Record<string, string> = {};
        subscriptions.forEach((sub: any) => {
          // Mark subscription/trial START date in BLUE
          if (sub.started_at) {
            const startDateStr = sub.started_at.split('T')[0];
            subDatesMap[startDateStr] = 'start_date';
            console.log('Subscription start date (BLUE):', startDateStr, sub.payment_method);
          }
          // Mark subscription/trial END date in RED
          if (sub.expires_at) {
            const endDateStr = sub.expires_at.split('T')[0];
            subDatesMap[endDateStr] = 'end_date';
            console.log('Subscription end date (RED):', endDateStr, sub.payment_method);
          }
        });
        console.log('Final subscription dates map:', subDatesMap);
        setSubscriptionDates(subDatesMap);

        // Check if marked today
        const hasMarked = await hasMarkedAttendanceToday(studentId);
        setMarkedToday(hasMarked);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [selectedDate, studentId]);

  const handleMarkAttendance = async () => {
    if (!studentId) return;

    setIsMarking(true);
    setMessage('');

    try {
      const result = await markAttendanceToday(studentId);

      if (result.success) {
        setMarkedToday(true);
        setMessage('✅ Attendance marked successfully!');

        // Update locally without reload
        const today = format(new Date(), 'yyyy-MM-dd');
        setAttendanceData((prev) => ({
          ...prev,
          [today]: true,
        }));
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Error marking attendance');
      console.error('Error:', error);
    }

    setIsMarking(false);
  };

  const isDayPresent = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceData[dateStr];
  };

  const getSubscriptionEventType = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return subscriptionDates[dateStr];
  };

  const isSubscriptionEvent = (date: Date) => {
    return !!getSubscriptionEventType(date);
  };

  const isPurchaseOrTrial = (date: Date) => {
    const type = getSubscriptionEventType(date);
    return type === 'start_date';
  };

  const isSubscriptionEndpoint = (date: Date) => {
    const type = getSubscriptionEventType(date);
    return type === 'end_date';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  const modifiers = {
    present: (date: Date) => isDayPresent(date),
    today: (date: Date) => isToday(date),
    future: (date: Date) => isFutureDate(date),
    purchaseOrTrial: (date: Date) => isPurchaseOrTrial(date),
    subscriptionEndpoint: (date: Date) => isSubscriptionEndpoint(date),
  };

  const modifiersStyles = {
    present: {
      backgroundColor: 'rgba(34, 197, 94, 0.3)',
      borderRadius: '8px',
      fontWeight: 'bold',
      color: '#22c55e',
      border: '2px solid rgb(34, 197, 94)',
    },
    today: {
      backgroundColor: 'rgba(34, 197, 94, 0.4)',
      boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)',
      borderRadius: '8px',
      fontWeight: 'bold',
    },
    future: {
      opacity: 0.4,
      color: 'rgb(107, 114, 128)',
    },
    purchaseOrTrial: {
      backgroundColor: 'rgba(34, 197, 94, 0.3)',
      borderRadius: '8px',
      fontWeight: 'bold',
      color: '#22c55e',
      border: '2px solid rgb(34, 197, 94)',
    },
    subscriptionEndpoint: {
      backgroundColor: 'rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      fontWeight: 'bold',
      color: '#ef4444',
      border: '2px solid rgb(239, 68, 68)',
    },
  };

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="backdrop-blur-xl bg-black/40 border border-cyan-500/20 rounded-2xl p-8 hover:border-cyan-500/40 transition-smooth animate-fade-in">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-cyan-300 mb-2">Attendance Calendar</h2>
        </div>

        {/* Calendar Widget */}
        <style>{`
          .rdp {
            --rdp-accent-color: rgb(34, 197, 94);
            --rdp-background-color: rgba(16, 185, 129, 0.2);
            --rdp-cell-size: 50px;
            --rdp-accent-color: rgb(6, 182, 212);
          }
          .rdp-caption {
            color: rgb(226, 232, 240);
            font-weight: bold;
            margin-bottom: 1rem;
            animation: fadeIn 0.3s ease-in-out;
          }
          .rdp-head_cell {
            color: rgb(148, 163, 184);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
          }
          .rdp-cell {
            color: rgb(226, 232, 240);
            animation: fadeIn 0.2s ease-in-out;
          }
          .rdp-day {
            border-radius: 8px;
            transition: all 0.2s;
          }
          .rdp-day:hover {
            background-color: rgba(6, 182, 212, 0.2);
          }
          .rdp-day_disabled {
            opacity: 0.3;
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>

        <div className="flex justify-center overflow-x-auto pb-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onMonthChange={setSelectedDate}
            month={selectedDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-3 mt-8 pt-6 border-t border-cyan-500/20 animate-fade-in">
          <div className="text-center">
            <p className="text-emerald-400 text-2xl font-bold">
              {Object.values(attendanceData).filter(Boolean).length}
            </p>
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mt-1">
              Days Present
            </p>
          </div>
        </div>
      </div>

      {/* Mark Attendance Button */}
      <div className="backdrop-blur-xl bg-black/40 border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-500/40 transition-smooth animate-fade-in">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold mb-1">Today's Attendance</p>
            <p className="text-gray-400 text-sm">
              {markedToday
                ? '✅ Already marked for today'
                : 'Mark your attendance for today'}
            </p>
          </div>
          <button
            onClick={handleMarkAttendance}
            disabled={markedToday || isMarking}
            className={`px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-smooth ${
              markedToday
                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-lg shadow-emerald-500/40 hover:shadow-emerald-400/50 hover:scale-105 active:scale-95'
            }`}
          >
            {isMarking ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 opacity-60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Marking...
              </span>
            ) : markedToday ? (
              '✓ Marked'
            ) : (
              'Mark Attendance'
            )}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm font-semibold text-center animate-fade-in ${
              message.includes('✅')
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
