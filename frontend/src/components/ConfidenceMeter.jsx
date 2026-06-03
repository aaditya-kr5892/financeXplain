
import React, { useState } from 'react';
import axios from 'axios';
import { Brain, AlertTriangle, CheckCircle, XCircle, Info, ArrowRight, X } from 'lucide-react';

const ConfidenceMeter = ({ onClose }) => {
    const [step, setStep] = useState(1); // 1: Input, 2: Analyzing, 3: Result
    const [formData, setFormData] = useState({
        amount: '',
        category: 'Shopping',
        description: ''
    });
    const [result, setResult] = useState(null);

    const categories = ['Shopping', 'Food', 'Entertainment', 'Electronics', 'Travel', 'Health', 'Education', 'Other'];

    const handleAnalyze = async () => {
        if (!formData.amount || !formData.description) return;
        setStep(2);
        try {
            const res = await axios.post('/api/confidence-meter', {
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description
            });
            setResult(res.data);
            setStep(3);
        } catch (err) {
            console.error(err);
            alert("Analysis failed. Please try again.");
            setStep(1);
        }
    };

    const getVerdictColor = (verdict) => {
        if (verdict === 'AVOID') return 'bg-rose-500 text-white';
        if (verdict === 'RECONSIDER') return 'bg-yellow-500 text-white';
        if (verdict === 'OK TO BUY') return 'bg-emerald-500 text-white';
        if (verdict === 'GO FOR IT') return 'bg-green-600 text-white';
        return 'bg-gray-500';
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-corporate-card border border-corporate-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-corporate-border flex justify-between items-center bg-corporate-bg/50">
                    <div className="flex items-center gap-2 text-corporate-text-main">
                        <Brain className="text-corporate-primary" size={20} />
                        <h2 className="font-bold">FinanceIQ Confidence Meter</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <X size={20} className="text-corporate-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right duration-300">
                            <p className="text-sm text-corporate-text-secondary text-center mb-4">
                                Not sure about a purchase? Let AI analyze your finances and give you an instant verdict.
                            </p>

                            <div>
                                <label className="block text-xs uppercase font-bold text-corporate-text-secondary mb-1">I want to buy...</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Designer Jacket, New iPhone"
                                    className="w-full bg-corporate-bg border border-corporate-border rounded-lg px-4 py-3 text-corporate-text-main focus:ring-1 focus:ring-corporate-primary outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase font-bold text-corporate-text-secondary mb-1">Cost (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-corporate-bg border border-corporate-border rounded-lg px-4 py-3 text-corporate-text-main focus:ring-1 focus:ring-corporate-primary outline-none"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-corporate-text-secondary mb-1">Category</label>
                                    <select
                                        className="w-full bg-corporate-bg border border-corporate-border rounded-lg px-4 py-3 text-corporate-text-main focus:ring-1 focus:ring-corporate-primary outline-none appearance-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!formData.amount || !formData.description}
                                className="w-full bg-gradient-to-r from-corporate-primary to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2 mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Brain size={18} /> Analyze with AI
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in">
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 border-4 border-corporate-border rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-corporate-primary rounded-full animate-spin"></div>
                                <Brain className="absolute inset-0 m-auto text-corporate-primary animate-pulse" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-corporate-text-main">Analyzing FinanceIQ...</h3>
                            <p className="text-sm text-corporate-text-secondary mt-2 text-center max-w-xs">
                                Checking your balance, bills, emergency fund, and goals...
                            </p>
                        </div>
                    )}

                    {step === 3 && result && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                            {/* Verdict Card */}
                            <div className={`${getVerdictColor(result.verdict)} p-6 rounded-2xl shadow-lg text-center relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                                <h4 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">AI Verdict</h4>
                                <h1 className="text-3xl font-black mb-2 tracking-tight">{result.verdict}</h1>

                                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                                    <span>Confidence: {result.confidence_score}%</span>
                                </div>
                            </div>

                            {/* Analysis Grid */}
                            <div className="grid gap-3">
                                <div className="bg-corporate-bg p-3 rounded-lg border border-corporate-border flex justify-between items-center">
                                    <span className="text-sm text-corporate-text-secondary">Necessity Score</span>
                                    <div className="flex gap-1">
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className={`w-1.5 h-4 rounded-full ${i < result.ai_analysis.necessity_score ? 'bg-corporate-primary' : 'bg-white/10'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-corporate-bg p-3 rounded-lg border border-corporate-border">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-corporate-text-secondary">Financial Impact</span>
                                        <span className={`text-xs font-bold ${result.financial_health.bills_coverage === 'Sufficient' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {result.financial_health.bills_coverage === 'Sufficient' ? 'Safe' : 'Risky'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-corporate-text-muted">
                                        Balance after: ₹{result.financial_health.balance_after.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* AI Commentary */}
                            <div className="bg-corporate-bg/50 p-4 rounded-lg border border-corporate-border">
                                <h5 className="flex items-center gap-2 text-sm font-bold text-corporate-text-main mb-2">
                                    <Brain size={16} className="text-corporate-primary" /> AI Reasoning
                                </h5>
                                <p className="text-sm text-corporate-text-secondary leading-relaxed">
                                    {result.ai_analysis.reasoning}
                                </p>

                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-sm font-medium text-corporate-text-main flex gap-2">
                                        <ArrowRight size={16} className="text-corporate-accent" />
                                        {result.ai_analysis.recommendation}
                                    </p>
                                </div>
                            </div>

                            {/* Alternatives */}
                            {result.ai_analysis.alternatives && result.ai_analysis.alternatives.length > 0 && (
                                <div>
                                    <h5 className="text-xs uppercase font-bold text-corporate-text-secondary mb-2">Better Alternatives</h5>
                                    <div className="space-y-2">
                                        {result.ai_analysis.alternatives.map((alt, idx) => (
                                            <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-sm text-emerald-200 flex items-start gap-2">
                                                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                                                {alt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={onClose} className="w-full py-3 text-sm text-corporate-text-secondary hover:text-white transition-colors">
                                Close Assessment
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfidenceMeter;
