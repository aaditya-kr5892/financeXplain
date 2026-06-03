import React from 'react';
import { LayoutDashboard, Receipt, Briefcase, Menu, Plus } from 'lucide-react';

const MobileNavbar = ({ activeTab, setActiveTab, onOpenEntry, onOpenMenu }) => {
    return (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-corporate-card/90 backdrop-blur-sm border-t border-corporate-border z-50 pb-safe-area shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] will-change-transform">
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'dashboard' ? 'text-corporate-primary' : 'text-corporate-text-secondary'}`}
                >
                    <LayoutDashboard size={20} />
                    <span className="text-[10px] font-medium">Home</span>
                </button>

                <button
                    onClick={() => setActiveTab('transactions')}
                    className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'transactions' ? 'text-corporate-primary' : 'text-corporate-text-secondary'}`}
                >
                    <Receipt size={20} />
                    <span className="text-[10px] font-medium">History</span>
                </button>

                {/* Floating Action Button (Center) */}
                <div className="relative -top-5">
                    <button
                        onClick={onOpenEntry}
                        className="bg-corporate-primary hover:bg-purple-600 text-white p-4 rounded-full shadow-lg shadow-corporate-primary/40 transition-transform active:scale-95 border-4 border-corporate-bg"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                <button
                    onClick={() => setActiveTab('assets')}
                    className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'assets' ? 'text-corporate-primary' : 'text-corporate-text-secondary'}`}
                >
                    <Briefcase size={20} />
                    <span className="text-[10px] font-medium">Assets</span>
                </button>

                {/* More Menu (Opens Sidebar/Drawer) */}
                <button
                    onClick={onOpenMenu}
                    className="flex flex-col items-center gap-1 p-2 text-corporate-text-secondary"
                >
                    <Menu size={20} />
                    <span className="text-[10px] font-medium">More</span>
                </button>
            </div>
        </div>
    );
};

export default MobileNavbar;
