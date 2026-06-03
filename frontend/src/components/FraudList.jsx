import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle, Search, AlertTriangle, ArrowLeft } from 'lucide-react';

const FraudList = ({ setActiveTab }) => {
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFraud = async () => {
            try {
                const res = await axios.get('/api/fraud-check');
                setAnomalies(res.data);
            } catch (err) {
                console.error("Failed to fetch fraud list", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFraud();
    }, []);

    const handleResolve = async (id) => {
        try {
            await axios.post('/api/resolve-fraud', { transaction_id: id });
            setAnomalies(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error("Failed to resolve fraud", err);
            alert("Failed to resolve alert. Please try again.");
        }
    };

    return (
        <div className="bg-corporate-card border border-corporate-border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="p-6 border-b border-corporate-border flex justify-between items-center bg-rose-900/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-corporate-text-secondary hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="text-xl font-bold text-rose-400 flex items-center gap-2">
                            <ShieldAlert size={24} />
                            Security Anomalies
                        </h3>
                        <p className="text-sm text-rose-300/70">Transactions flagged for unusual activity</p>
                    </div>
                </div>
            </div>

            <div className="p-0">
                {loading ? (
                    <div className="p-8 text-center text-corporate-text-secondary">Scanning...</div>
                ) : anomalies.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 mb-4">
                            <CheckCircle size={48} />
                        </div>
                        <h4 className="text-lg font-bold text-corporate-text-main">All Clear</h4>
                        <p className="text-corporate-text-secondary">No suspicious transactions detected.</p>
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className="mt-6 px-4 py-2 bg-corporate-card border border-corporate-border rounded text-sm hover:text-white transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-corporate-bg text-corporate-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-corporate-border">
                            <tr>
                                <th className="px-6 py-4">Anomaly Type</th>
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4">Risk Level</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-corporate-border">
                            {anomalies.map((txn) => (
                                <tr key={txn.id || txn.date + txn.amount} className="hover:bg-rose-500/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-rose-400 font-medium">
                                            <AlertTriangle size={16} />
                                            Suspected Fraud
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-corporate-text-main">{txn.description}</div>
                                        <div className="text-xs text-corporate-text-secondary">Detected via isolation forest</div>
                                        <div className="text-xs text-rose-300/50 mt-1">
                                            {txn.reasons && txn.reasons.join(", ")}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                            HIGH RISK
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-rose-400">
                                        -₹{Math.abs(txn.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleResolve(txn.id)}
                                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition-colors shadow-sm"
                                        >
                                            Resolve
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default FraudList;
