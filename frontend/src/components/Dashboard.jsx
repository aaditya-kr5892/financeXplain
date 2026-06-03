import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, AlertCircle, TrendingUp, DollarSign, Activity, Target } from 'lucide-react';
import axios from 'axios';
import ManualEntry from './ManualEntry';
import Budget from './Budget';
import FinancialHealth from './FinancialHealth';
import ImpactSimulator from './ImpactSimulator';
import FraudAlerts from './FraudAlerts';

const Dashboard = () => {
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [period, setPeriod] = useState('monthly');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await axios.get('/api/stats');
                setStats(statsRes.data);
                const analyticsRes = await axios.get(`/api/analytics?period=${period}`);
                setData(analyticsRes.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
                setStats({ income: 0, expense: 0, balance: 0 });
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshKey, period]);

    return (
        <div className="bg-corporate-bg min-h-full font-sans text-corporate-text-main p-6 animate-in fade-in zoom-in duration-300">

            {/* Top Row: KPI Cards Strip (Minimalist) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <KPICard
                    title="Net Position"
                    amount={stats.balance}
                    icon={Wallet}
                    trend={12.5}
                    isCurrency
                />
                <KPICard
                    title="Total Revenue"
                    amount={stats.income}
                    icon={DollarSign}
                    trend={8.2}
                    isPositive
                    isCurrency
                />
                <KPICard
                    title="Total Spend"
                    amount={Math.abs(stats.expense)}
                    icon={Activity}
                    trend={-2.4}
                    isPositive={false}
                    isCurrency
                />
                <KPICard
                    title="Savings Rate"
                    amount={`${stats.income ? Math.round(((stats.income - Math.abs(stats.expense)) / stats.income) * 100) : 0}%`}
                    icon={Target}
                    trend={1.2}
                    isPositive
                />
            </div>

            {/* Main Content Grid: Bento Box Style */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Column 1: Actions & Context (Left Sidebar feel) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Quick Entry */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm">
                        <ManualEntry onTransactionAdded={() => setRefreshKey(k => k + 1)} />
                    </div>

                    {/* Simulator */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm h-fit">
                        <ImpactSimulator />
                    </div>
                </div>

                {/* Column 2 & 3: Main Visuals (Center Stage) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Chart */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-corporate-text-main">Cash Flow Trends</h3>
                                <p className="text-xs text-corporate-text-secondary uppercase tracking-wider">Revenue vs Expenses</p>
                            </div>
                            <div className="flex bg-corporate-bg rounded-md p-1 border border-corporate-border">
                                {['weekly', 'monthly', 'yearly'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${period === p
                                            ? 'bg-corporate-primary text-white shadow-sm'
                                            : 'text-corporate-text-secondary hover:text-white'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00B7C3" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00B7C3" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#7F56D9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D35" vertical={false} />
                                    <XAxis dataKey="name" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F1F26', borderColor: '#2D2D35', color: '#FFF' }}
                                        itemStyle={{ fontSize: 12 }}
                                    />
                                    <Legend iconType="circle" />
                                    <Area type="monotone" dataKey="amount" name="Net Flow" stroke="#00B7C3" fill="url(#colorIncome)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Secondary Metrics / Budget */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm">
                        <Budget />
                    </div>
                </div>

                {/* Column 4: Insights & Health (Right Sidebar) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm">
                        <FinancialHealth />
                    </div>

                    {/* Fraud / Security Alerts */}
                    <div className="mb-6">
                        <FraudAlerts />
                    </div>

                    {/* AI Insight Tile */}
                    <div className="bg-gradient-to-b from-corporate-card to-corporate-bg border border-corporate-border rounded-lg p-5 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles size={60} />
                        </div>
                        <h4 className="text-sm font-bold text-corporate-accent uppercase tracking-widest mb-3">AI Analysis</h4>
                        <p className="text-corporate-text-main text-sm leading-relaxed mb-4">
                            {Math.abs(stats.expense) > stats.income * 0.5
                                ? "Spend Alert: Expenses exceed 50% of income ratio. Recommended action: Audit discretionary categories."
                                : "Healthy Status: Savings trajectory aligns with Q3 targets. Revenue streams acting as primary buffer."}
                        </p>
                        <button
                            onClick={async () => {
                                try {
                                    const res = await axios.get('/api/report');
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
                                    const downloadAnchorNode = document.createElement('a');
                                    downloadAnchorNode.setAttribute("href", dataStr);
                                    downloadAnchorNode.setAttribute("download", "financial_report.json");
                                    document.body.appendChild(downloadAnchorNode);
                                    downloadAnchorNode.click();
                                    downloadAnchorNode.remove();
                                } catch (e) {
                                    console.error("Report generation failed", e);
                                }
                            }}
                            className="bg-corporate-primary/10 hover:bg-corporate-primary/20 text-xs text-corporate-primary hover:text-white px-3 py-2 rounded transition-all border border-corporate-primary/20 flex items-center gap-2"
                        >
                            <ArrowDownRight size={14} />
                            Download Full Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, amount, icon: Icon, trend, isPositive, isCurrency }) => (
    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 hover:border-corporate-primary/30 transition-colors group">
        <div className="flex justify-between items-start mb-2">
            <span className="text-corporate-text-secondary text-xs font-semibold uppercase tracking-wider">{title}</span>
            <Icon size={16} className="text-corporate-text-muted group-hover:text-corporate-primary transition-colors" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-corporate-text-main">
                {isCurrency ? `₹${amount?.toLocaleString() || 0}` : amount}
            </h3>
        </div>
        <div className="mt-3 flex items-center gap-2">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trend > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-corporate-text-muted text-[10px]">vs last period</span>
        </div>
    </div>
);

export default Dashboard;
