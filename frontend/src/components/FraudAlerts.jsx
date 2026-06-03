import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

const FraudAlerts = ({ setActiveTab }) => {
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkFraud = async () => {
            try {
                const res = await axios.get('/api/fraud-check');
                setAnomalies(res.data);
            } catch (err) {
                console.error("Fraud check failed", err);
            } finally {
                setLoading(false);
            }
        };
        checkFraud();
    }, []);

    if (loading) return null;

    if (anomalies.length === 0) {
        return (
            <div className="bg-corporate-card border border-emerald-500/20 rounded-lg p-5 shadow-sm flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-corporate-text-main">Security Check</h4>
                    <p className="text-xs text-corporate-text-secondary">No anomalies detected. Your account is secure.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-rose-900/10 border border-rose-500/30 rounded-lg p-5 shadow-sm animate-in pulse fade-in duration-500">
            <div className="flex items-center gap-3 mb-3">
                <ShieldAlert className="text-rose-500" size={24} />
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Security Alert</h3>
            </div>

            <p className="text-corporate-text-main text-sm mb-3">
                We detected <strong>{anomalies.length} suspicious transactions</strong> that deviate from your normal spending patterns.
            </p>

            <div className="space-y-2">
                {anomalies.slice(0, 3).map((txn, idx) => ( // Show max 3
                    <div key={idx} className="bg-corporate-bg/50 p-2 rounded flex justify-between items-center border border-rose-500/10 text-xs">
                        <span className="text-corporate-text-main font-medium">{txn.description}</span>
                        <span className="text-rose-400 font-bold">-₹{Math.abs(txn.amount)}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => setActiveTab('fraud')}
                className="w-full mt-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded transition-colors border border-rose-500/20"
            >
                Review All Alerts
            </button>
        </div>
    );
};

export default FraudAlerts;
