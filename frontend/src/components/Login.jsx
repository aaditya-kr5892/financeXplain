import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Scroll, Feather, Key } from 'lucide-react';

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
                // Auto login after register or ask to login? Let's auto login
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
                onLogin(res.data.token); // Token is just username
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "The spell fizzled. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-hogwarts-dark flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Magic */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-hogwarts-blue/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-20%] left-[10%] w-[500px] h-[500px] bg-hogwarts-gold/10 rounded-full blur-[80px]" />
                {/* Floating particles */}
                <div className="absolute top-[20%] left-[20%] w-1 h-1 bg-white shadow-[0_0_10px_white] rounded-full animate-bounce" />
                <div className="absolute top-[50%] right-[30%] w-1 h-1 bg-hogwarts-gold shadow-[0_0_10px_gold] rounded-full animate-pulse" />
            </div>

            <div className="max-w-md w-full bg-hogwarts-blue/40 backdrop-blur-xl border border-hogwarts-gold/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-magical font-bold text-hogwarts-gold drop-shadow-lg mb-2 flex items-center justify-center gap-3">
                        <Sparkles className="text-yellow-400" />
                        FinDash
                    </h1>
                    <p className="text-slate-400 font-serif italic text-lg">
                        "Manage your Gringotts Vault with ease"
                    </p>
                </div>

                {/* Toggle Tabs */}
                <div className="flex mb-8 bg-slate-900/50 p-1 rounded-xl">
                    <button
                        onClick={() => setIsRegistering(false)}
                        className={`flex-1 py-2 rounded-lg font-serif font-bold transition-all ${!isRegistering
                            ? 'bg-hogwarts-gold text-hogwarts-dark shadow-md'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsRegistering(true)}
                        className={`flex-1 py-2 rounded-lg font-serif font-bold transition-all ${isRegistering
                            ? 'bg-hogwarts-gold text-hogwarts-dark shadow-md'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        New Wizard
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-serif text-hogwarts-gold mb-2 pl-1">
                            Wizarding Name
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                <Scroll size={18} />
                            </span>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Harry Potter"
                                required
                                className="w-full bg-slate-900/60 border border-hogwarts-gold/20 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hogwarts-gold focus:ring-1 focus:ring-hogwarts-gold transition-all font-serif placeholder-slate-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-serif text-hogwarts-gold mb-2 pl-1">
                            Secret Spell (Password)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                <Key size={18} />
                            </span>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                className="w-full bg-slate-900/60 border border-hogwarts-gold/20 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hogwarts-gold focus:ring-1 focus:ring-hogwarts-gold transition-all font-serif placeholder-slate-600"
                            />
                        </div>
                    </div>

                    {isRegistering && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <label className="block text-sm font-serif text-hogwarts-gold mb-2 pl-1">
                                Initial Vault Balance (Galleons)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₹</span>
                                <input
                                    type="number"
                                    name="initial_balance"
                                    value={formData.initial_balance}
                                    onChange={handleChange}
                                    placeholder="1000"
                                    required={isRegistering}
                                    className="w-full bg-slate-900/60 border border-hogwarts-gold/20 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hogwarts-gold focus:ring-1 focus:ring-hogwarts-gold transition-all font-serif placeholder-slate-600"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center font-serif">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-hogwarts-gold to-yellow-600 hover:from-yellow-400 hover:to-yellow-700 text-hogwarts-dark font-magical font-bold text-lg py-3 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Casting...' : (isRegistering ? 'Open Vault' : 'Enter Vault')}
                        {!loading && <Feather size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
