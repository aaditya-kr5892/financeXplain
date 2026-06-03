import React, { useState } from 'react';
import axios from 'axios';
import { ShoppingCart, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';

const ImpactSimulator = () => {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Shopping');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const categories = ['Food', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Healthcare', 'Transportation', 'Education', 'Other'];

    const handleSimulate = async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/simulate', {
                amount: parseFloat(amount),
                category
            });
            setResult(res.data);
        } catch (err) {
            console.error("Simulation failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-corporate-text-main">
                <ShoppingCart className="text-corporate-accent" size={20} />
                Impact Simulator
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-corporate-text-secondary mb-1">Simulate Purchase (₹)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary transition-colors text-sm"
                        placeholder="e.g. 5000"
                    />
                </div>
                <div>
                    <label className="block text-xs text-corporate-text-secondary mb-1">On Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary transition-colors text-sm"
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <button
                    onClick={handleSimulate}
                    disabled={loading}
                    className="w-full bg-corporate-card border border-corporate-border hover:bg-corporate-primary hover:text-white text-corporate-text-secondary py-2 rounded font-medium transition-all flex justify-center items-center gap-2 text-sm"
                >
                    {loading ? 'Simulating...' : 'Run Simulation'}
                </button>
            </div>

            {result && (
                <div className={`mt-4 p-3 rounded border ${result.impact.includes('Critical') ? 'bg-rose-500/10 border-rose-500/20' : result.impact.includes('Warning') ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} animate-in zoom-in`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-corporate-text-secondary">Projected Balance</span>
                        <span className="font-bold text-corporate-text-main text-sm">₹{result.new_balance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        {result.impact.includes('Safe') ? (
                            <CheckCircle size={14} className="text-emerald-400" />
                        ) : (
                            <AlertTriangle size={14} className={result.impact.includes('Critical') ? 'text-rose-400' : 'text-yellow-400'} />
                        )}
                        <span className={`text-xs font-medium ${result.impact.includes('Critical') ? 'text-rose-300' : result.impact.includes('Warning') ? 'text-yellow-300' : 'text-emerald-300'}`}>
                            {result.impact}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImpactSimulator;
