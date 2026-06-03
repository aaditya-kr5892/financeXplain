import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import axios from 'axios';
import FileUpload from './FileUpload';

const Dashboard = () => {
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch real stats from backend
                const statsRes = await axios.get('/api/stats');
                setStats(statsRes.data);

                // Fetch transactions and generate chart data
                const transRes = await axios.get('/api/transactions');
                const transactions = transRes.data;

                // Generate monthly chart data from transactions
                const monthlyData = {};
                transactions.forEach(t => {
                    const date = new Date(t.date);
                    const monthKey = date.toLocaleString('default', { month: 'short' });
                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = 0;
                    }
                    monthlyData[monthKey] += Math.abs(t.amount);
                });

                const chartData = Object.entries(monthlyData).map(([name, amount]) => ({
                    name,
                    amount: Math.round(amount)
                }));

                setData(chartData.length > 0 ? chartData : [
                    { name: 'Jan', amount: 4000 }, { name: 'Feb', amount: 3000 },
                    { name: 'Mar', amount: 2000 }, { name: 'Apr', amount: 2780 },
                    { name: 'May', amount: 1890 }, { name: 'Jun', amount: 2390 },
                ]);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
                // Fallback to mock data if API fails
                setStats({ income: 5400, expense: 3200, balance: 2200 });
                setData([
                    { name: 'Jan', amount: 4000 }, { name: 'Feb', amount: 3000 },
                    { name: 'Mar', amount: 2000 }, { name: 'Apr', amount: 2780 },
                    { name: 'May', amount: 1890 }, { name: 'Jun', amount: 2390 },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshKey]); // Added refreshKey to dependency array

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            {/* Upload Section */}
            <div className="mb-8" id="file-upload-section">
                <FileUpload onUploadSuccess={() => setRefreshKey(k => k + 1)} />
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Balance"
                    amount={`$${stats.balance}`}
                    trend="+12%"
                    isPositive={true}
                    icon={Wallet}
                />
                <StatCard
                    title="Monthly Income"
                    amount={`$${stats.income}`}
                    trend="+5%"
                    isPositive={true}
                    icon={ArrowUpRight}
                />
                <StatCard
                    title="Monthly Expenses"
                    amount={`$${stats.expense}`}
                    trend="-2%"
                    isPositive={false} // actually good if expenses are down, but red usually means 'expense'
                    // logic: if expenses down, good. let's assume trend is 'increase in expense' = bad
                    color="red"
                    icon={ArrowDownRight}
                />
            </div>

            {/* Main Chart */}
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-xl font-semibold mb-6">Cash Flow Analytics</h3>
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
