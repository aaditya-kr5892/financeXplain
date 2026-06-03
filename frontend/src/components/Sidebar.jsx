import React, { useState } from 'react';
import { LayoutDashboard, Receipt, LineChart, TrendingUp, Settings, ChevronLeft, ChevronRight, PieChart, AlertCircle, Users, Calendar, Briefcase, Shield } from 'lucide-react';
import SettingsModal from './SettingsModal';

const Sidebar = ({ activeTab, setActiveTab, isOpen, toggle }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transactions', icon: Receipt },
        { id: 'assets', label: 'Assets', icon: Briefcase },
        { id: 'wealth_impact', label: 'Wealth Impact', icon: TrendingUp },
        { id: 'risk', label: 'Risk Profile', icon: Shield },
        { id: 'insights', label: 'Analytics', icon: PieChart },
        { id: 'forecast', label: 'Forecasts', icon: TrendingUp },
        { id: 'recurring_payments', label: 'Recurring Bills', icon: Calendar },
        { id: 'split_bill', label: 'Split Bill', icon: Users },
        { id: 'fraud', label: 'Fraud Alerts', icon: AlertCircle },
    ];

    return (
        <div className={`${isOpen ? 'w-56' : 'w-20'} bg-corporate-card border-r border-corporate-border flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out`}>
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-corporate-border">
                <div className={`flex items-center gap-2 text-corporate-text-main font-bold text-xl tracking-tight ${!isOpen && 'justify-center w-full'}`}>
                    <div className="w-8 h-8 bg-corporate-primary/20 rounded-md flex items-center justify-center text-corporate-primary shrink-0">
                        <LineChart size={20} />
                    </div>
                    {isOpen && <span className="animate-in fade-in duration-200">FinSight</span>}
                </div>
                {/* Toggle Button (Only visible when open, or maybe move it to bottom if closed? Let's keep it here but separate logic) */}
                {isOpen && (
                    <button onClick={toggle} className="text-corporate-text-secondary hover:text-white transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center ${isOpen ? 'space-x-3 px-3' : 'justify-center px-0'} py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${activeTab === item.id
                            ? 'bg-corporate-primary/10 text-corporate-primary border-l-2 border-corporate-primary'
                            : 'text-corporate-text-secondary hover:bg-white/5 hover:text-corporate-text-main'
                            }`}
                        title={!isOpen ? item.label : ''}
                    >
                        <item.icon size={20} className={activeTab === item.id ? "text-corporate-primary" : "text-corporate-text-secondary group-hover:text-corporate-text-main"} />
                        {isOpen && <span className="animate-in fade-in duration-200">{item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-corporate-border flex flex-col items-center">
                {!isOpen && (
                    <button onClick={toggle} className="mb-4 text-corporate-text-secondary hover:text-white transition-colors">
                        <ChevronRight size={20} />
                    </button>
                )}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className={`w-full flex items-center ${isOpen ? 'space-x-3 px-3' : 'justify-center'} py-2 text-corporate-text-secondary hover:text-white transition-colors text-sm font-medium`}
                >
                    <Settings size={20} />
                    {isOpen && <span>Configuration</span>}
                </button>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>

    );
};

export default Sidebar;
