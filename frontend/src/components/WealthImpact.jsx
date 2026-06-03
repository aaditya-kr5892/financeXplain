import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, DollarSign, Wallet, ArrowRight, AlertTriangle, Lightbulb } from 'lucide-react';

const WealthImpact = () => {
    const [monthlySpend, setMonthlySpend] = useState(5000);
    const [category, setCategory] = useState("Food Delivery");
    const [rate, setRate] = useState(12); // 12% CAGR
    const [timeline, setTimeline] = useState(10); // 10 years

    // Calculate SIP Future Value
    const calculateWealth = (p, r, n_years) => {
        const i = r / 100 / 12;
        const n = n_years * 12;
        // FV = P * [ (1+i)^n - 1 ] * (1+i) / i
        return p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    };

    const generateData = () => {
        const data = [];
        for (let year = 1; year <= 20; year++) {
            const invested = monthlySpend * 12 * year;
            const value = calculateWealth(monthlySpend, rate, year);
            data.push({
                year: `Year ${year}`,
                Spending: invested,
                Wealth: Math.round(value)
            });
        }
        return data.slice(0, timeline); // Show up to selected timeline or fixed 20
    };

    const data = generateData();
    const futureValue = calculateWealth(monthlySpend, rate, timeline);
    const totalSpent = monthlySpend * 12 * timeline;
    const gain = futureValue - totalSpent;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-corporate-text-main">
                        Wealth Impact
                    </h2>
                    <p className="text-corporate-text-secondary">See the real cost of your spending habits</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-corporate-text-main mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-yellow-500" size={20} /> Opportunity Cost
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">I spend on...</label>
                            <input
                                type="text"
                                className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Monthly Amount (₹)</label>
                            <input
                                type="number"
                                className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                value={monthlySpend}
                                onChange={(e) => setMonthlySpend(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Time Horizon (Years): {timeline}</label>
                            <input
                                type="range"
                                min="1"
                                max="30"
                                className="w-full"
                                value={timeline}
                                onChange={(e) => setTimeline(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Exp. Return Rate (%): {rate}%</label>
                            <input
                                type="range"
                                min="5"
                                max="20"
                                className="w-full"
                                value={rate}
                                onChange={(e) => setRate(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-corporate-bg/50 rounded-lg border border-corporate-border">
                        <div className="flex items-start gap-3">
                            <Lightbulb className="text-yellow-400 shrink-0 mt-1" size={20} />
                            <div>
                                <h4 className="text-sm font-semibold text-corporate-text-main">Smart Insight</h4>
                                <p className="text-xs text-corporate-text-secondary mt-1">
                                    Cutting your {category} spending by just 50% could add
                                    <span className="text-emerald-400 font-bold ml-1">₹{((futureValue - totalSpent) / 2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span> to your wealth!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results & Chart */}
                <div className="lg:col-span-2 bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm flex flex-col">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-corporate-bg rounded-lg border border-corporate-border">
                            <p className="text-corporate-text-secondary text-xs uppercase">Total Spent (Principal)</p>
                            <p className="text-2xl font-bold text-corporate-text-main">₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                            <p className="text-emerald-400 text-xs uppercase">Potential Wealth (FV)</p>
                            <p className="text-3xl font-bold text-emerald-400">₹{futureValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-emerald-300/80 mt-1">+{((gain / totalSpent) * 100).toFixed(0)}% Growth</p>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="year" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    formatter={(value) => `₹${value.toLocaleString()}`}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="Wealth" stroke="#10b981" fillOpacity={1} fill="url(#colorWealth)" strokeWidth={2} />
                                <Area type="monotone" dataKey="Spending" stroke="#6366f1" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WealthImpact;
