import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HeartPulse, TrendingUp, AlertCircle } from 'lucide-react';

const FinancialHealth = () => {
    const [health, setHealth] = useState({ score: 0, status: 'Loading', savings_rate: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await axios.get('/api/health');
                setHealth(res.data);
            } catch (err) {
                console.error("Failed to fetch health score", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHealth();
    }, []);

    // Color logic
    const getColor = (score) => {
        if (score >= 80) return 'text-green-400 stroke-green-500';
        if (score >= 50) return 'text-yellow-400 stroke-yellow-500';
        return 'text-red-400 stroke-red-500';
    };

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (health.score / 100) * circumference;

    return (
        <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="text-sm font-semibold text-corporate-text-secondary mb-4 z-10 flex items-center gap-2 uppercase tracking-wider">
                Financial Health Score
            </h3>

            <div className="relative z-10 my-4">
                {/* SVG Ring */}
                <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="#2D2D35"
                        strokeWidth="8"
                        fill="transparent"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ease-out ${getColor(health.score).split(' ')[1]}`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${getColor(health.score).split(' ')[0]}`}>
                        {loading ? '...' : health.score}
                    </span>
                </div>
            </div>

            <div className="mt-2 text-center z-10">
                <p className={`font-medium text-sm ${getColor(health.score).split(' ')[0]}`}>{health.status}</p>
                <div className="mt-2 text-xs text-corporate-text-muted flex items-center gap-1 justify-center">
                    Savings Rate: {health.savings_rate}%
                </div>
            </div>
        </div>
    );
};

export default FinancialHealth;
