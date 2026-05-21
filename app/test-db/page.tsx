'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestDbPage() {
    const [status, setStatus] = useState<string>('Ready to test connection');

    const handleTestInsertion = async () => {
        setStatus('Inserting mock student...');

        const { data, error } = await supabase
            .from('students')
            .insert([
                {
                    name: 'Test Student',
                    phone: '9999999999',
                    email: 'test@library.com',
                    target_exam: 'UPSC',
                },
            ])
            .select();

        if (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        } else {
            console.log('Success!', data);
            setStatus(`Successfully connected! Inserted student ID: ${data[0].id}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
            <p className="mb-6 text-slate-300 bg-slate-800 px-4 py-2 rounded">{status}</p>
            <button
                onClick={handleTestInsertion}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg shadow-md transition"
            >
                Trigger DB Insert Test
            </button>
        </div>
    );
}