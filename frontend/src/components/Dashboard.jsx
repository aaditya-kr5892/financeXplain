import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, AlertCircle, TrendingUp, DollarSign, Activity, Target } from 'lucide-react';
import axios from 'axios';
import Budget from './Budget';
import FinancialHealth from './FinancialHealth';
import ImpactSimulator from './ImpactSimulator';
import FraudAlerts from './FraudAlerts';

const Dashboard = ({ setActiveTab, refreshTrigger, fraudData, fraudLoading }) => {
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [refreshKey, setRefreshKey] = useState(0);

    const [period, setPeriod] = useState('monthly'); // For Chart
    const [overviewPeriod, setOverviewPeriod] = useState('monthly'); // For Cards
    const [downloading, setDownloading] = useState({ analysis: false, statement: false });

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
    }, [refreshKey, period, refreshTrigger]);

    const handleReportDownload = async (type) => {
        const range = document.getElementById('report-range').value;
        let query = "";

        if (range !== 'all') {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(range));

            const formatDate = (d) => d.toISOString().split('T')[0];
            query = `?start_date=${formatDate(start)}&end_date=${formatDate(end)}`;
        }

        try {
            setDownloading(prev => ({ ...prev, [type]: true }));

            let endpoint = type === 'analysis' ? '/api/report/pdf' : '/api/report/statement';
            let filename = type === 'analysis' ? 'Financial_Analysis.pdf' : 'Transaction_Statement.pdf';

            const res = await axios.get(`${endpoint}${query}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error("Download failed", e);
            alert("Could not generate document. Please check data availability for this period.");
        } finally {
            setDownloading(prev => ({ ...prev, [type]: false }));
        }
    };

    return (
        <div className="bg-corporate-bg min-h-full font-sans text-corporate-text-main p-6 animate-in fade-in zoom-in duration-300">

            {/* Top Row: KPI Cards Strip (Minimalist) */}
            <div className="flex flex-col gap-4 mb-6">
                {/* Period Toggle */}
                <div className="flex justify-end">
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-1 flex gap-1">
                        {[
                            { id: 'monthly', label: 'Monthly' },
                            { id: 'yearly', label: 'Yearly' },
                            { id: 'all_time', label: 'All Time' }
                        ].map(p => (
                            <button
                                key={p.id}
                                onClick={() => setOverviewPeriod(p.id)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${overviewPeriod === p.id ? 'bg-corporate-primary text-white shadow-lg shadow-corporate-primary/20' : 'text-corporate-text-secondary hover:text-corporate-text-main'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KPICard
                        title="Balance"
                        amount={stats.balance}
                        icon={Wallet}
                        trend={12.5}
                        isCurrency
                    />
                    <KPICard
                        title="Credit"
                        amount={stats.credit ? stats.credit[overviewPeriod] : stats.income}
                        icon={DollarSign}
                        trend={8.2}
                        isPositive
                        isCurrency
                        valueColor="text-emerald-500"
                    />
                    <KPICard
                        title="Debit"
                        amount={Math.abs(stats.debit ? stats.debit[overviewPeriod] : stats.expense)}
                        icon={Activity}
                        trend={-2.4}
                        isPositive={false}
                        isCurrency
                        valueColor="text-rose-500"
                    />
                    <KPICard
                        title="Savings Rate"
                        amount={`${stats.income ? Math.round(((stats.income - Math.abs(stats.expense)) / stats.income) * 100) : 0}%`}
                        icon={Target}
                        trend={1.2}
                        isPositive
                    />
                </div>
            </div>

            {/* Main Content Grid: Bento Box Style */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Column 1: Health & Simulator (Left Sidebar) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Financial Health */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm">
                        <FinancialHealth />
                    </div>

                    {/* Simulator */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm h-fit">
                        <ImpactSimulator />
                    </div>
                </div>

                {/* Column 2 & 3: Main Visuals (Center Stage) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Fraud Alerts (Central Priority) */}
                    <div className="w-full">
                        <FraudAlerts setActiveTab={setActiveTab} anomalies={fraudData} loading={fraudLoading} />
                    </div>

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


                </div>

                {/* Column 4: Budget & Reports (Right Sidebar) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Budget */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm">
                        <Budget />
                    </div>

                    {/* Report Center & AI Insights */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="text-corporate-accent" size={18} />
                            <h4 className="text-sm font-bold text-corporate-text-main uppercase tracking-wider">Smart Insights & Reports</h4>
                        </div>
                        {/* ... content remains ... */}
                        <p className="text-corporate-text-secondary text-sm leading-relaxed mb-6 border-l-2 border-corporate-primary pl-3 italic">
                            {Math.abs(stats.expense) > stats.income * 0.5
                                ? "Spend Alert: Expenses exceed 50% of income ratio. Recommended action: Audit discretionary categories."
                                : "Healthy Status: Savings trajectory aligns with Q3 targets. Revenue streams acting as primary buffer."}
                        </p>

                        {/* Report Controls */}
                        <div className="bg-corporate-bg/50 rounded-lg p-4 border border-corporate-border">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs text-corporate-text-muted font-medium">Time Period:</label>
                                <select
                                    id="report-range"
                                    className="bg-corporate-card border border-corporate-border text-xs text-corporate-text-main rounded px-2 py-1 outline-none focus:border-corporate-primary"
                                >
                                    <option value="30">Last 30 Days</option>
                                    <option value="180">Last 6 Months</option>
                                    <option value="365">Last 1 Year</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleReportDownload('analysis')}
                                    disabled={downloading.analysis}
                                    className="flex flex-col items-center justify-center p-3 rounded bg-corporate-primary/10 hover:bg-corporate-primary/20 border border-corporate-primary/20 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloading.analysis ? (
                                        <div className="h-4 w-4 border-2 border-corporate-primary border-t-transparent rounded-full animate-spin mb-1"></div>
                                    ) : (
                                        <ArrowDownRight size={16} className="text-corporate-primary mb-1 group-hover/btn:translate-y-0.5 transition-transform" />
                                    )}
                                    <span className="text-[10px] font-semibold text-corporate-primary">
                                        {downloading.analysis ? "Generating..." : "Analysis Report"}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleReportDownload('statement')}
                                    disabled={downloading.statement}
                                    className="flex flex-col items-center justify-center p-3 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloading.statement ? (
                                        <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                                    ) : (
                                        <Wallet size={16} className="text-emerald-500 mb-1 group-hover/btn:translate-y-0.5 transition-transform" />
                                    )}
                                    <span className="text-[10px] font-semibold text-emerald-500">
                                        {downloading.statement ? "Generating..." : "Bank Statement"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, amount, icon: Icon, trend, isPositive, isCurrency, valueColor }) => (
    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 hover:border-corporate-primary/30 transition-colors group">
        <div className="flex justify-between items-start mb-2">
            <span className="text-corporate-text-secondary text-xs font-semibold uppercase tracking-wider">{title}</span>
            <Icon size={16} className="text-corporate-text-muted group-hover:text-corporate-primary transition-colors" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-bold ${valueColor || 'text-corporate-text-main'}`}>
                {isCurrency ? `₹${(Math.abs(amount) || 0).toLocaleString()}` : amount}
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
