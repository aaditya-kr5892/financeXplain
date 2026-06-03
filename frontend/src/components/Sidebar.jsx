import React from 'react';
import { LayoutDashboard, Receipt, LineChart, TrendingUp, Settings, SlidersHorizontal, PieChart } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transactions', icon: Receipt },
        { id: 'insights', label: 'Analytics', icon: PieChart },
        { id: 'forecast', label: 'Forecasts', icon: TrendingUp },
    ];

    return (
        <div className="w-64 bg-corporate-card border-r border-corporate-border flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-corporate-border">
                <div className="flex items-center gap-2 text-corporate-text-main font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-corporate-primary/20 rounded-md flex items-center justify-center text-corporate-primary">
                        <LineChart size={20} />
                    </div>
                    FinSight
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${activeTab === item.id
                            ? 'bg-corporate-primary/10 text-corporate-primary border-l-2 border-corporate-primary'
                            : 'text-corporate-text-secondary hover:bg-white/5 hover:text-corporate-text-main'
                            }`}
                    >
                        <item.icon size={18} className={activeTab === item.id ? "text-corporate-primary" : "text-corporate-text-secondary group-hover:text-corporate-text-main"} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-corporate-border">
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-corporate-text-secondary hover:text-white transition-colors text-sm font-medium">
                    <Settings size={18} />
                    <span>Configuration</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
