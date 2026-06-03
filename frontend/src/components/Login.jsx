import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, ArrowRight, Wallet, Sparkles } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        initial_balance: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegistering) {
                // Register
                await axios.post('/api/register', {
                    username: formData.username,
                    password: formData.password,
                    initial_balance: parseFloat(formData.initial_balance)
                });
                // Auto login after register
                const res = await axios.post('/api/login', {
                    username: formData.username,
                    password: formData.password
                });
                onLogin(res.data.token);
            } else {
                // Login
                const res = await axios.post('/api/login', {
                    username: formData.username,
                    password: formData.password
                });
                onLogin(res.data.token);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-corporate-bg flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-corporate-primary rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] bg-corporate-accent rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full bg-corporate-card border border-corporate-border rounded-2xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-corporate-text-main mb-2 flex items-center justify-center gap-2">
                        <Sparkles className="text-corporate-primary" />
                        FinSight
                    </h1>
                    <p className="text-corporate-text-secondary text-sm">
                        Advanced AI-Powered Financial Analytics
                    </p>
                </div>

                {/* Toggle Tabs */}
                <div className="flex mb-8 bg-corporate-bg/50 p-1 rounded-xl border border-corporate-border">
                    <button
                        onClick={() => setIsRegistering(false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!isRegistering
                            ? 'bg-corporate-primary text-white shadow-sm'
                            : 'text-corporate-text-secondary hover:text-corporate-text-main'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsRegistering(true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${isRegistering
                            ? 'bg-corporate-primary text-white shadow-sm'
                            : 'text-corporate-text-secondary hover:text-corporate-text-main'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-corporate-text-secondary mb-1 uppercase tracking-wider">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-corporate-text-muted">
                                <User size={18} />
                            </span>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Enter your username"
                                required
                                className="w-full bg-corporate-bg border border-corporate-border rounded-xl py-3 pl-12 pr-4 text-corporate-text-main focus:outline-none focus:border-corporate-primary focus:ring-1 focus:ring-corporate-primary transition-all placeholder-corporate-text-muted"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-corporate-text-secondary mb-1 uppercase tracking-wider">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-corporate-text-muted">
                                <Lock size={18} />
                            </span>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                className="w-full bg-corporate-bg border border-corporate-border rounded-xl py-3 pl-12 pr-4 text-corporate-text-main focus:outline-none focus:border-corporate-primary focus:ring-1 focus:ring-corporate-primary transition-all placeholder-corporate-text-muted"
                            />
                        </div>
                    </div>

                    {isRegistering && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="block text-xs font-bold text-corporate-text-secondary mb-1 uppercase tracking-wider">
                                Initial Balance
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-corporate-text-muted">₹</span>
                                <input
                                    type="number"
                                    name="initial_balance"
                                    value={formData.initial_balance}
                                    onChange={handleChange}
                                    placeholder="50000"
                                    required={isRegistering}
                                    className="w-full bg-corporate-bg border border-corporate-border rounded-xl py-3 pl-12 pr-4 text-corporate-text-main focus:outline-none focus:border-corporate-primary focus:ring-1 focus:ring-corporate-primary transition-all placeholder-corporate-text-muted"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-corporate-primary to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-corporate-text-muted">
                        Secured by Enterprise Grade Encryption
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
