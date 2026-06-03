import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Calendar } from 'lucide-react';
import axios from 'axios';
import ManualEntry from './ManualEntry';
import Budget from './Budget';

const Dashboard = () => {
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [period, setPeriod] = useState('monthly'); // weekly, monthly, yearly

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch real stats
                const statsRes = await axios.get('/api/stats');
                setStats(statsRes.data);

                // Fetch Analytics Data based on period
                const analyticsRes = await axios.get(`/api/analytics?period=${period}`);
                setData(analyticsRes.data);

            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
                // Fallback
                setStats({ income: 0, expense: 0, balance: 0 });
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshKey, period]);

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            {/* Manual Entry Section - ID kept for 'Add Transaction' button scroll */}
            <div className="mb-8" id="file-upload-section">
                <ManualEntry onTransactionAdded={() => setRefreshKey(k => k + 1)} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Balance"
                    amount={`₹${stats.balance}`}
                    trend="+12%"
                    isPositive={true}
                    icon={Wallet}
                />
                <StatCard
                    title="Monthly Income"
                    amount={`₹${stats.income}`}
                    trend="+5%"
                    isPositive={true}
                    icon={ArrowUpRight}
                />
                <StatCard
                    title="Monthly Expenses"
                    amount={`₹${Math.abs(stats.expense)}`}
                    trend="-2%"
                    isPositive={false}
                    color="red"
                    icon={ArrowDownRight}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart (Span 2 cols) */}
                <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold">Cash Flow Analytics</h3>
                        <div className="bg-slate-700/50 p-1 rounded-lg flex space-x-1">
                            {['weekly', 'monthly', 'yearly'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${period === p
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAmt)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Budget Component (Span 1 col) */}
                <div className="lg:col-span-1">
                    <Budget />
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, amount, trend, isPositive, icon: Icon, color }) => (
    <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all hover:transform hover:-translate-y-1 shadow-lg">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <Icon size={24} />
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {trend}
            </span>
        </div>
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold mt-1">{amount}</p>
    </div>
);

export default Dashboard;
