import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Content */}
            <div className="relative bg-corporate-card border border-corporate-border rounded-lg shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-corporate-border">
                    <h3 className="text-lg font-semibold text-corporate-text-main">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-corporate-text-secondary hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
