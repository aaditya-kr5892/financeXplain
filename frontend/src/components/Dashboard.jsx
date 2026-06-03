import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, AlertCircle, TrendingUp, DollarSign, Activity, Target, Briefcase, Brain } from 'lucide-react';
import axios from 'axios';
import Budget from './Budget';
import FinancialHealth from './FinancialHealth';
import FraudAlerts from './FraudAlerts';
import ConfidenceMeter from './ConfidenceMeter';

const Dashboard = ({ setActiveTab, refreshTrigger, fraudData, fraudLoading }) => {
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [refreshKey, setRefreshKey] = useState(0);

    const [period, setPeriod] = useState('monthly'); // For Chart
    const [overviewPeriod, setOverviewPeriod] = useState('monthly'); // For Cards
    const [downloading, setDownloading] = useState({ analysis: false, statement: false, portfolio: false });
    const [showConfidenceMeter, setShowConfidenceMeter] = useState(false);

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

            let endpoint;
            let filename;

            if (type === 'analysis') {
                endpoint = '/api/report/pdf';
                filename = 'Financial_Analysis.pdf';
            } else if (type === 'statement') {
                endpoint = '/api/report/statement';
                filename = 'Transaction_Statement.pdf';
            } else if (type === 'portfolio') {
                endpoint = '/api/report/portfolio';
                filename = 'Portfolio_Report.pdf';
            }

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
                        trend={0} // Balance trend requires history snapshots not yet in API, keeping 0 for now
                        isCurrency
                    />
                    <KPICard
                        title="Credit"
                        amount={stats.credit ? stats.credit[overviewPeriod] : stats.income}
                        icon={DollarSign}
                        trend={stats.trends && overviewPeriod !== 'all_time' ? stats.trends[overviewPeriod]?.income : 0}
                        isPositive={stats.trends && overviewPeriod !== 'all_time' ? stats.trends[overviewPeriod]?.income >= 0 : true}
                        isCurrency
                        valueColor="text-emerald-500"
                    />
                    <KPICard
                        title="Debit"
                        amount={Math.abs(stats.debit ? stats.debit[overviewPeriod] : stats.expense)}
                        icon={Activity}
                        trend={stats.trends && overviewPeriod !== 'all_time' ? stats.trends[overviewPeriod]?.expense : 0}
                        isPositive={stats.trends && overviewPeriod !== 'all_time' ? stats.trends[overviewPeriod]?.expense < 0 : false} // Expense down is good
                        isCurrency
                        valueColor="text-rose-500"
                    />
                    <KPICard
                        title="Savings Rate"
                        amount={`${stats.income ? Math.round(((stats.income - Math.abs(stats.expense)) / stats.income) * 100) : 0}%`}
                        icon={Target}
                        trend={0} // Savings rate trend derived from above, complex to calc in single line, 0 for now
                        isPositive
                    />
                </div>
            </div>

            {/* Main Content Grid: Bento Box Style - Symmetric Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">

                {/* Column 1: Health & FinanceIQ (Left Sidebar) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Financial Health */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm flex-1">
                        <FinancialHealth />
                    </div>

                    {/* FinanceIQ Meter Trigger */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm relative overflow-hidden h-[180px] flex flex-col justify-center">
                        <h3 className="text-sm font-bold text-corporate-text-main flex items-center gap-2 mb-2">
                            <Brain size={18} className="text-corporate-primary" /> FinanceIQ Meter
                        </h3>
                        <p className="text-xs text-corporate-text-secondary mb-4 relative z-10">
                            Instantly analyze potential purchases with AI.
                        </p>
                        <button
                            onClick={() => setShowConfidenceMeter(true)}
                            className="w-full py-2.5 bg-corporate-primary hover:bg-purple-600 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-corporate-primary/20 transition-all flex items-center justify-center gap-2 relative z-10"
                        >
                            <Sparkles size={14} /> Should I Buy This?
                        </button>
                    </div>
                </div>

                {/* Column 2 & 3: Main Visuals (Center Stage) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Fraud Alerts */}
                    <div className="w-full">
                        <FraudAlerts setActiveTab={setActiveTab} anomalies={fraudData} loading={fraudLoading} />
                    </div>

                    {/* Main Chart - Adjusted Height to fill space */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm flex-1 min-h-[400px]">
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
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Budget */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm flex-1">
                        <Budget />
                    </div>

                    {/* Report Center */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 shadow-sm h-[280px] flex flex-col justify-between relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="text-corporate-accent" size={18} />
                            <h4 className="text-sm font-bold text-corporate-text-main uppercase tracking-wider">Smart Insights</h4>
                        </div>
                        {/* ... content remains ... */}
                        <p className="text-corporate-text-secondary text-xs leading-relaxed mb-4 border-l-2 border-corporate-primary pl-3 italic">
                            {Math.abs(stats.expense) > stats.income * 0.5
                                ? "Spend Alert: Exp > 50% of Income. Audit discretionary."
                                : "Healthy: Savings on track."}
                        </p>

                        {/* Report Controls */}
                        <div className="bg-corporate-bg/50 -mx-5 -mb-5 p-4 border-t border-corporate-border mt-auto">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] text-corporate-text-muted font-medium">Period:</label>
                                <select
                                    id="report-range"
                                    className="bg-corporate-card border border-corporate-border text-[10px] text-corporate-text-main rounded px-1 py-0.5 outline-none focus:border-corporate-primary"
                                >
                                    <option value="30">30 Days</option>
                                    <option value="180">6 Months</option>
                                    <option value="365">1 Year</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => handleReportDownload('analysis')}
                                    disabled={downloading.analysis}
                                    className="flex items-center justify-between p-2 rounded bg-corporate-primary/10 hover:bg-corporate-primary/20 border border-corporate-primary/20 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                >
                                    <div className="flex items-center gap-2">
                                        <ArrowDownRight size={14} className="text-corporate-primary" />
                                        <span className="text-[10px] font-semibold text-corporate-primary">Analysis Report</span>
                                    </div>
                                    {downloading.analysis && <div className="h-3 w-3 border-2 border-corporate-primary border-t-transparent rounded-full animate-spin"></div>}
                                </button>
                                <button
                                    onClick={() => handleReportDownload('statement')}
                                    disabled={downloading.statement}
                                    className="flex items-center justify-between p-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                >
                                    <div className="flex items-center gap-2">
                                        <Wallet size={14} className="text-emerald-500" />
                                        <span className="text-[10px] font-semibold text-emerald-500">Bank Statement</span>
                                    </div>
                                    {downloading.statement && <div className="h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
                                </button>
                                <button
                                    onClick={() => handleReportDownload('portfolio')}
                                    disabled={downloading.portfolio}
                                    className="flex items-center justify-between p-2 rounded bg-corporate-primary/10 hover:bg-corporate-primary/20 border border-corporate-primary/20 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                >
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={14} className="text-corporate-primary" />
                                        <span className="text-[10px] font-semibold text-corporate-primary">Portfolio Report</span>
                                    </div>
                                    {downloading.portfolio && <div className="h-3 w-3 border-2 border-corporate-primary border-t-transparent rounded-full animate-spin"></div>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confidence Meter Modal */}
            {showConfidenceMeter && <ConfidenceMeter onClose={() => setShowConfidenceMeter(false)} />}
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
                {isCurrency ? `₹${(Math.abs(amount) || 0).toLocaleString('en-IN')}` : amount}
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
