import React from 'react';
import { Home, PieChart, TrendingUp, Settings, Activity } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: Home },
        { id: 'transactions', label: 'Transactions', icon: PieChart },
        { id: 'insights', label: 'Smart Insights', icon: Activity },
        { id: 'forecast', label: 'Future Cashflow', icon: TrendingUp },
    ];

    return (
        <div className="w-64 bg-slate-800/50 backdrop-blur-xl border-r border-white/10 flex flex-col p-6 h-screen fixed left-0 top-0">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mb-10">
                FinDash AI
            </h2>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === item.id
                                ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="pt-6 border-t border-white/10">
                <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-400 hover:text-white transition-colors">
                    <Settings size={20} />
                    <span>Settings</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
