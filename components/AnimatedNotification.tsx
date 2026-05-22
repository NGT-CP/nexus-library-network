import { useEffect, useState } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface AnimatedNotificationProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
    autoClose?: number;
}

export default function AnimatedNotification({
    message,
    type,
    onClose,
    autoClose = 4000,
}: AnimatedNotificationProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
        }, autoClose);

        return () => clearTimeout(timer);
    }, [autoClose, onClose]);

    const typeConfig = {
        success: {
            bg: 'bg-emerald-500/20',
            border: 'border-emerald-500/40',
            text: 'text-emerald-300',
            icon: '✓',
            shadow: 'shadow-emerald-500/20',
        },
        error: {
            bg: 'bg-red-500/20',
            border: 'border-red-500/40',
            text: 'text-red-300',
            icon: '✕',
            shadow: 'shadow-red-500/20',
        },
        info: {
            bg: 'bg-blue-500/20',
            border: 'border-blue-500/40',
            text: 'text-blue-300',
            icon: 'ⓘ',
            shadow: 'shadow-blue-500/20',
        },
        warning: {
            bg: 'bg-orange-500/20',
            border: 'border-orange-500/40',
            text: 'text-orange-300',
            icon: '⚠',
            shadow: 'shadow-orange-500/20',
        },
    };

    const config = typeConfig[type];

    return (
        <div
            className={`fixed top-6 right-6 z-[9999] transform transition-all duration-300 ease-out ${
                isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
            }`}
        >
            <div
                className={`
                    flex items-center gap-3 px-5 py-3.5 rounded-lg border backdrop-blur-xl
                    ${config.bg} ${config.border} ${config.text} ${config.shadow}
                    shadow-lg animate-slide-in-right
                    max-w-sm
                `}
            >
                <div className="text-lg font-bold">{config.icon}</div>
                <p className="text-sm font-medium">{message}</p>
                <button
                    onClick={() => {
                        setIsExiting(true);
                        setTimeout(onClose, 300);
                    }}
                    className="ml-2 text-current opacity-60 hover:opacity-100 transition-opacity"
                >
                    ×
                </button>
            </div>
        </div>
    );
}
