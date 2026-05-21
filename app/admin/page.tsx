'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { addMikrotikUser, getMikrotikUserSpeed } from '../lib/mikrotik';

type Device = {
    id: number;
    device_name: string;
    mac_address: string;
    last_active_at: string | null;
    bytes_uploaded: number;
};

type Student = {
    id: number;
    name: string;
    phone: string;
    speed_limit: string;
    is_blocked: boolean;
    devices?: Device[];
};

type StudentFormState = {
    name: string;
    phone: string;
    email: string;
    target_exam: string;
    emergency_contact: string;
    address: string;
    speed_limit: string;
};

type ManageModalState = {
    studentId: number | null;
    student: Student | null;
};

type TrialFormState = {
    days: string;
};

type CashFormState = {
    amount: string;
    daysValid: string;
};

// Helper functions
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isDeviceActive = (lastActiveAt: string | null): boolean => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt).getTime();
    const now = new Date().getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return now - lastActive < twentyFourHoursMs;
};

const calculateStats = (students: Student[]) => {
    let active = 0;
    let offline = 0;
    let blocked = 0;

    students.forEach((student) => {
        if (student.is_blocked) {
            blocked++;
        } else {
            const hasActiveDevice =
                student.devices && student.devices.some(d => isDeviceActive(d.last_active_at));
            if (hasActiveDevice) {
                active++;
            } else {
                offline++;
            }
        }
    });

    return { active, offline, blocked };
};

const generateReceiptNumber = (): string => {
    return 'RCP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

const INITIAL_FORM_STATE: StudentFormState = {
    name: '',
    phone: '',
    email: '',
    target_exam: '',
    emergency_contact: '',
    address: '',
    speed_limit: '12M',
};

export default function AdminDashboard() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<StudentFormState>(INITIAL_FORM_STATE);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [manageModal, setManageModal] = useState<ManageModalState>({ studentId: null, student: null });
    const [trialForm, setTrialForm] = useState<TrialFormState>({ days: '' });
    const [cashForm, setCashForm] = useState<CashFormState>({ amount: '', daysValid: '' });
    const [manageTab, setManageTab] = useState<'status' | 'trial' | 'cash'>('status');
    const [currentSpeeds, setCurrentSpeeds] = useState<Record<number, { upload: string; download: string } | null>>({});
    const [loadingSpeed, setLoadingSpeed] = useState<Record<number, boolean>>({});

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('students')
            .select('*, devices(*)')
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching students:', error);
        } else {
            setStudents(data || []);
        }
        setLoading(false);
    };

    const handleOpenModal = () => {
        setFormData(INITIAL_FORM_STATE);
        setFormError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormError('');
    };

    const handleInputChange = (field: keyof StudentFormState, value: string) => {
        if (field === 'phone' || field === 'emergency_contact') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
            setFormData((prev) => ({ ...prev, [field]: digitsOnly }));
            return;
        }

        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError('');
        setSuccessMessage('');

        if (!formData.name.trim()) {
            setFormError('Name is required.');
            return;
        }

        if (!/^\d{10}$/.test(formData.phone)) {
            setFormError('Phone must be exactly 10 digits.');
            return;
        }

        if (formData.emergency_contact && !/^\d{10}$/.test(formData.emergency_contact)) {
            setFormError('Emergency contact must be exactly 10 digits.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            name: formData.name.trim(),
            phone: formData.phone,
            email: formData.email.trim() || null,
            target_exam: formData.target_exam.trim() || null,
            emergency_contact: formData.emergency_contact || null,
            address: formData.address.trim() || null,
            speed_limit: formData.speed_limit,
        };

        const { error } = await supabase
            .from('students')
            .insert([payload]);

        if (error) {
            setFormError(error.message);
            setIsSubmitting(false);
            return;
        }

        // Attempt to add user to MikroTik
        const mikrotikResult = await addMikrotikUser(
            formData.phone,
            formData.speed_limit
        );

        if (!mikrotikResult.success) {
            console.warn(
                `Student added to database but MikroTik sync failed: ${mikrotikResult.error}`
            );
        }

        handleCloseModal();
        setSuccessMessage('Student added successfully.');
        await fetchStudents();
        setIsSubmitting(false);
    };

    const handleToggleBlock = async () => {
        if (!manageModal.student) return;

        const newBlockStatus = !manageModal.student.is_blocked;

        const { error } = await supabase
            .from('students')
            .update({ is_blocked: newBlockStatus })
            .eq('id', manageModal.student.id);

        if (error) {
            console.error('Failed to update block status:', error);
            return;
        }

        // TODO: Sync with MikroTik RouterOS to block/unblock user on the physical router
        // Call appropriate MikroTik function to update user status

        await fetchStudents();
        setManageModal({ studentId: null, student: null });
    };

    const handleChangeSpeed = async (newSpeed: string) => {
        if (!manageModal.student) return;

        const { error } = await supabase
            .from('students')
            .update({ speed_limit: newSpeed })
            .eq('id', manageModal.student.id);

        if (error) {
            console.error('Failed to update speed limit:', error);
            return;
        }

        // TODO: Sync with MikroTik RouterOS to update rate-limit rules for this user
        // Call addMikrotikUser or similar function with new speed_limit

        await fetchStudents();
        setManageModal({ ...manageModal, student: { ...manageModal.student, speed_limit: newSpeed } });
    };

    const handleGrantTrial = async () => {
        if (!manageModal.student || !trialForm.days) return;

        const days = parseInt(trialForm.days);
        if (isNaN(days) || days <= 0) {
            alert('Please enter a valid number of days');
            return;
        }

        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + days * 24 * 60 * 60 * 1000);

        const { error } = await supabase
            .from('subscriptions')
            .insert([{
                student_id: manageModal.student.id,
                payment_method: 'TRIAL',
                status: 'ACTIVE',
                started_at: startedAt.toISOString(),
                expires_at: expiresAt.toISOString(),
                receipt_number: generateReceiptNumber(),
            }]);

        if (error) {
            console.error('Failed to grant trial:', error);
            return;
        }

        setTrialForm({ days: '' });
        alert(`Trial granted for ${days} days`);
        setManageTab('status');
    };

    const handleAddCashSubscription = async () => {
        if (!manageModal.student || !cashForm.amount || !cashForm.daysValid) return;

        const amount = parseFloat(cashForm.amount);
        const daysValid = parseInt(cashForm.daysValid);

        if (isNaN(amount) || amount <= 0 || isNaN(daysValid) || daysValid <= 0) {
            alert('Please enter valid amounts');
            return;
        }

        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + daysValid * 24 * 60 * 60 * 1000);

        const { error } = await supabase
            .from('subscriptions')
            .insert([{
                student_id: manageModal.student.id,
                payment_method: 'CASH',
                status: 'ACTIVE',
                amount_paid: amount,
                started_at: startedAt.toISOString(),
                expires_at: expiresAt.toISOString(),
                receipt_number: generateReceiptNumber(),
            }]);

        if (error) {
            console.error('Failed to add subscription:', error);
            return;
        }

        setCashForm({ amount: '', daysValid: '' });
        alert(`Subscription added for ₹${amount}`);
        setManageTab('status');
    };

    const handleCloseManageModal = () => {
        setManageModal({ studentId: null, student: null });
        setTrialForm({ days: '' });
        setCashForm({ amount: '', daysValid: '' });
        setManageTab('status');
    };

    const fetchCurrentSpeed = async (studentId: number, phone: string) => {
        setLoadingSpeed((prev) => ({ ...prev, [studentId]: true }));
        const speed = await getMikrotikUserSpeed(phone);
        setCurrentSpeeds((prev) => ({ ...prev, [studentId]: speed }));
        setLoadingSpeed((prev) => ({ ...prev, [studentId]: false }));
    };

    const { active, offline, blocked } = calculateStats(students);

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black text-white p-6 sm:p-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
                <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-orange-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float animate-delay-300"></div>
                <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-25 animate-float animate-delay-500"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="mb-10 animate-slide-in-down">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                        <div>
                            <div className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-orange-400 bg-clip-text text-transparent mb-2">
                                ADMIN CONTROL
                            </div>
                            <p className="text-gray-400 text-sm font-light">Network & Student Management</p>
                        </div>
                        <button
                            onClick={handleOpenModal}
                            className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-400 hover:to-blue-500 text-black font-bold px-6 py-2.5 rounded-lg transition-smooth shadow-lg shadow-orange-500/50 hover:shadow-orange-400/50 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm"
                        >
                            + New Student
                        </button>
                    </div>

                    {successMessage && (
                        <div className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
                            {successMessage}
                        </div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 hover:border-emerald-500/50 transition-smooth hover:scale-105 cursor-pointer">
                            <p className="text-emerald-300 text-xs uppercase tracking-widest font-semibold mb-1">Active Now</p>
                            <p className="text-3xl font-bold text-emerald-400">{active}</p>
                            <p className="text-xs text-emerald-200/60 mt-1">Devices in last 24h</p>
                        </div>
                        <div className="backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 hover:border-yellow-500/50 transition-smooth hover:scale-105 cursor-pointer">
                            <p className="text-yellow-300 text-xs uppercase tracking-widest font-semibold mb-1">Offline</p>
                            <p className="text-3xl font-bold text-yellow-400">{offline}</p>
                            <p className="text-xs text-yellow-200/60 mt-1">No activity in 24h</p>
                        </div>
                        <div className="backdrop-blur-xl bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 hover:border-orange-500/50 transition-smooth hover:scale-105 cursor-pointer">
                            <p className="text-orange-300 text-xs uppercase tracking-widest font-semibold mb-1">Blocked</p>
                            <p className="text-3xl font-bold text-orange-400">{blocked}</p>
                            <p className="text-xs text-orange-200/60 mt-1">Suspended access</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="backdrop-blur-xl bg-black/40 border border-blue-500/20 rounded-2xl overflow-hidden shadow-2xl hover:border-blue-500/40 transition-smooth animate-fade-in-up">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-blue-500/20 bg-black/60">
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">ID</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">Name & Phone</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">Speed Limit</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">Current Speed</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">Devices Connected</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">Data Used</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest">Status</th>
                                    <th className="p-5 font-bold text-blue-300 text-sm uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center">
                                            <div className="flex justify-center">
                                                <div className="w-8 h-8 border-2 border-blue-400 border-t-orange-400 rounded-full animate-spin"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-500 text-sm">
                                            No students found. Add one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((student) => {
                                        const deviceCount = student.devices?.length || 0;
                                        const totalDataUsed = student.devices?.reduce((sum, d) => sum + (d.bytes_uploaded || 0), 0) || 0;
                                        const hasActiveDevice = student.devices?.some(d => isDeviceActive(d.last_active_at));
                                        const statusLabel = student.is_blocked ? 'Blocked' : (hasActiveDevice ? 'Active Now' : 'Offline');
                                        const statusColor = student.is_blocked ? 'orange' : (hasActiveDevice ? 'emerald' : 'yellow');

                                        return (
                                            <tr key={student.id} className="border-b border-blue-500/10 hover:bg-blue-500/10 transition-smooth">
                                                <td className="p-5 text-gray-400 font-mono text-sm">#{student.id}</td>
                                                <td className="p-5">
                                                    <p className="font-semibold text-white">{student.name}</p>
                                                    <p className="text-gray-300 font-mono text-xs mt-1">{student.phone}</p>
                                                </td>
                                                <td className="p-5">
                                                    <span className="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1.5 rounded-lg border border-cyan-500/40 font-semibold uppercase tracking-wider">
                                                        {student.speed_limit}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    {loadingSpeed[student.id] ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                                                            <span className="text-xs text-orange-300">Loading...</span>
                                                        </div>
                                                    ) : currentSpeeds[student.id] ? (
                                                        <div className="text-xs">
                                                            <p className="text-orange-300 font-semibold">↑ {currentSpeeds[student.id]!.upload}</p>
                                                            <p className="text-orange-300">↓ {currentSpeeds[student.id]!.download}</p>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => fetchCurrentSpeed(student.id, student.phone)}
                                                            className="text-orange-400 hover:text-orange-300 text-xs font-bold uppercase tracking-wider transition-smooth bg-orange-500/10 hover:bg-orange-500/30 px-2 py-1.5 rounded-lg border border-orange-500/30 hover:border-orange-500/60"
                                                        >
                                                            Refresh
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-5">
                                                    {deviceCount > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {student.devices?.map((device) => (
                                                                <div
                                                                    key={device.id}
                                                                    className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1.5 rounded-lg border border-blue-500/40 whitespace-nowrap"
                                                                >
                                                                    <p className="font-semibold">{device.device_name}</p>
                                                                    <p className="text-blue-200/70 text-xs font-mono">{device.mac_address}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">No devices</span>
                                                    )}
                                                </td>
                                                <td className="p-5">
                                                    <span className="bg-violet-500/20 text-violet-300 text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 font-semibold">
                                                        {formatBytes(totalDataUsed)}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <span
                                                        className={`text-${statusColor}-300 bg-${statusColor}-500/20 px-3 py-1.5 rounded-lg text-xs font-bold border border-${statusColor}-500/40 uppercase tracking-wider`}
                                                    >
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => setManageModal({ studentId: student.id, student })}
                                                        className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider transition-smooth bg-cyan-500/10 hover:bg-cyan-500/30 px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-500/60 hover:scale-110 active:scale-95"
                                                    >
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md px-4">
                        <div className="w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900/90 shadow-2xl shadow-blue-950/50 backdrop-blur-xl">
                            <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
                                <h2 className="text-lg font-bold tracking-wide text-cyan-300">Add New Student</h2>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="text-slate-400 hover:text-slate-200 text-xl leading-none"
                                    aria-label="Close modal"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleAddStudent} className="space-y-4 px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            required
                                            className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                            placeholder="Student name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Phone *</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            required
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                            placeholder="10 digit phone"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                            placeholder="student@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Target Exam</label>
                                        <input
                                            type="text"
                                            value={formData.target_exam}
                                            onChange={(e) => handleInputChange('target_exam', e.target.value)}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                            placeholder="UPSC, SSC, NEET..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Emergency Contact</label>
                                        <input
                                            type="tel"
                                            value={formData.emergency_contact}
                                            onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Speed Limit</label>
                                        <input
                                            type="text"
                                            value={formData.speed_limit}
                                            onChange={(e) => handleInputChange('speed_limit', e.target.value)}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                            placeholder="e.g. 12M"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="Optional address"
                                    />
                                </div>

                                {formError && (
                                    <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-300">
                                        {formError}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/80 transition-smooth"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="rounded-lg bg-gradient-to-r from-orange-500 to-blue-600 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-orange-500/40 hover:from-orange-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Manage Student Modal */}
                {manageModal.student !== null && manageModal.student !== undefined ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md px-4">
                        <div className="w-full max-w-3xl rounded-2xl border border-slate-700/60 bg-slate-900/90 shadow-2xl shadow-blue-950/50 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4 sticky top-0 bg-slate-900/95">
                                <div>
                                    <h2 className="text-lg font-bold tracking-wide text-cyan-300">Manage Student</h2>
                                    <p className="text-xs text-slate-400 mt-1">{manageModal.student!.name} • {manageModal.student!.phone}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseManageModal}
                                    className="text-slate-400 hover:text-slate-200 text-xl leading-none"
                                    aria-label="Close modal"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="px-6 py-6">
                                {/* Tabs */}
                                <div className="flex gap-2 mb-6 border-b border-slate-700/40 pb-4">
                                    <button
                                        onClick={() => setManageTab('status')}
                                        className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-smooth ${
                                            manageTab === 'status'
                                                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                                        }`}
                                    >
                                        Status & Speed
                                    </button>
                                    <button
                                        onClick={() => setManageTab('trial')}
                                        className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-smooth ${
                                            manageTab === 'trial'
                                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                                        }`}
                                    >
                                        Grant Trial
                                    </button>
                                    <button
                                        onClick={() => setManageTab('cash')}
                                        className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-smooth ${
                                            manageTab === 'cash'
                                                ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                                        }`}
                                    >
                                        Add Subscription
                                    </button>
                                </div>

                                {/* Status & Speed Tab */}
                                {manageTab === 'status' && (
                                    <div className="space-y-6">
                                        {/* Status Toggle */}
                                        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-white mb-1">Access Status</p>
                                                    <p className="text-xs text-slate-400">
                                                        {manageModal.student!.is_blocked ? 'User is currently blocked' : 'User is currently active'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleToggleBlock}
                                                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-smooth ${
                                                        manageModal.student!.is_blocked
                                                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/40'
                                                            : 'bg-orange-500/30 text-orange-300 border border-orange-500/50 hover:bg-orange-500/40'
                                                    }`}
                                                >
                                                    {manageModal.student!.is_blocked ? 'Unblock User' : 'Block User'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Speed Limit Change */}
                                        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
                                            <p className="font-semibold text-white mb-4">Change Speed Limit</p>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">
                                                        Enter Speed (e.g., 5M, 12M, 50M)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        defaultValue={manageModal.student!.speed_limit}
                                                        id="speedInput"
                                                        placeholder="e.g., 20M"
                                                        className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const input = document.getElementById('speedInput') as HTMLInputElement;
                                                        if (input?.value) {
                                                            handleChangeSpeed(input.value);
                                                        }
                                                    }}
                                                    className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-cyan-500/40 hover:from-cyan-400 hover:to-blue-500"
                                                >
                                                    Update Speed
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Grant Trial Tab */}
                                {manageTab === 'trial' && (
                                    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
                                        <p className="font-semibold text-white mb-4">Grant Free Trial</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">
                                                    Days *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={trialForm.days}
                                                    onChange={(e) => setTrialForm({ days: e.target.value })}
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                                                    placeholder="e.g., 7"
                                                />
                                            </div>
                                            <button
                                                onClick={handleGrantTrial}
                                                disabled={!trialForm.days}
                                                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                Grant Trial
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Add Cash Subscription Tab */}
                                {manageTab === 'cash' && (
                                    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6">
                                        <p className="font-semibold text-white mb-4">Add Cash Subscription</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">
                                                    Amount Paid (₹) *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={cashForm.amount}
                                                    onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                                                    placeholder="e.g., 500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">
                                                    Days Valid *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={cashForm.daysValid}
                                                    onChange={(e) => setCashForm({ ...cashForm, daysValid: e.target.value })}
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                                                    placeholder="e.g., 30"
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddCashSubscription}
                                                disabled={!cashForm.amount || !cashForm.daysValid}
                                                className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-orange-500/40 hover:from-orange-400 hover:to-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                Add Subscription
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
                <div className="mt-8 text-center text-xs text-gray-500 font-light">
                    System Status • Real-time Sync • Secure Access
                </div>
            </div>
        </div>
    );
}