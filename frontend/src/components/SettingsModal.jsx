import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { User, Lock, Trash2, Moon, Sun, Monitor } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {};
            if (formData.username) payload.username = formData.username;
            if (formData.password) payload.password = formData.password;

            if (Object.keys(payload).length === 0) return;

            const res = await axios.put('/api/user/profile', payload);
            alert("Profile updated successfully!");
            if (payload.username) {
                // Update token/header if changed
                localStorage.setItem('user', JSON.stringify({ username: payload.username }));
                // Force reload or redirect to login
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            alert("Update failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you sure? This will delete ALL your data permanently!")) {
            try {
                await axios.delete('/api/user/profile');
                alert("Account deleted.");
                localStorage.clear();
                window.location.reload();
            } catch (err) {
                alert("Delete failed.");
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            <div className="flex gap-4 mb-6 border-b border-corporate-border">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-2 px-4 transition-colors ${activeTab === 'profile' ? 'border-b-2 border-corporate-primary text-corporate-primary font-medium' : 'text-corporate-text-secondary hover:text-corporate-text-main'}`}
                >
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('appearance')}
                    className={`pb-2 px-4 transition-colors ${activeTab === 'appearance' ? 'border-b-2 border-corporate-primary text-corporate-primary font-medium' : 'text-corporate-text-secondary hover:text-corporate-text-main'}`}
                >
                    Appearance
                </button>
            </div>

            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Update Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-corporate-text-secondary" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-corporate-bg border border-corporate-border rounded pl-10 pr-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                    placeholder="New Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Change Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-corporate-text-secondary" size={18} />
                                <input
                                    type="password"
                                    className="w-full bg-corporate-bg border border-corporate-border rounded pl-10 pr-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                    placeholder="New Password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-corporate-primary hover:bg-corporate-primary/90 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-corporate-border">
                        <h3 className="text-red-500 font-medium mb-2">Danger Zone</h3>
                        <button
                            onClick={handleDeleteAccount}
                            className="w-full border border-red-500 text-red-500 hover:bg-red-500/10 font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Delete Account
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'appearance' && (
                <div className="space-y-4 text-center">
                    <p className="text-corporate-text-secondary mb-4">Choose your preferred theme</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-4 rounded-lg border flex flex-col items-center gap-3 transition-colors ${theme === 'light' ? 'border-corporate-primary bg-corporate-primary/5' : 'border-corporate-border hover:border-corporate-text-secondary'}`}
                        >
                            <Sun size={32} className={theme === 'light' ? 'text-corporate-primary' : 'text-corporate-text-secondary'} />
                            <span className="font-medium text-corporate-text-main">Light</span>
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-4 rounded-lg border flex flex-col items-center gap-3 transition-colors ${theme === 'dark' ? 'border-corporate-primary bg-corporate-primary/5' : 'border-corporate-border hover:border-corporate-text-secondary'}`}
                        >
                            <Moon size={32} className={theme === 'dark' ? 'text-corporate-primary' : 'text-corporate-text-secondary'} />
                            <span className="font-medium text-corporate-text-main">Dark</span>
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default SettingsModal;
