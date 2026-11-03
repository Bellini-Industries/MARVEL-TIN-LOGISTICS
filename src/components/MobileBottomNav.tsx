import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Fuel,
  Receipt,
  Wallet,
  Compass,
  DollarSign,
  TrendingUp,
  Clock,
  Truck,
  FileText,
  Sliders
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectTracking: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onSelectTracking
}) => {
  const { isDark } = useTheme();
  const { isDriver, isAccountant, isDispatcher, isAdmin } = useAuth();

  const navItems = useMemo(() => {
    if (isDriver) {
      return [
        { id: 'dashboard', label: 'My Cab', icon: Truck },
        { id: 'fuel', label: 'Fuel', icon: Fuel },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
        { id: 'petty_cash', label: 'Float', icon: Wallet },
        { id: 'borders', label: 'Borders', icon: Clock }
      ];
    }
    if (isAccountant) {
      return [
        { id: 'accounting', label: 'Finance', icon: DollarSign },
        { id: 'profitability', label: 'Margins', icon: TrendingUp },
        { id: 'petty_cash', label: 'Float', icon: Wallet },
        { id: 'expenses', label: 'Audits', icon: Receipt },
        { id: 'reports', label: 'Reports', icon: FileText }
      ];
    }
    if (isDispatcher) {
      return [
        { id: 'dashboard', label: 'Orders', icon: LayoutDashboard },
        { id: 'tracking', label: 'Corridor', icon: Compass },
        { id: 'borders', label: 'Borders', icon: Clock },
        { id: 'trips', label: 'Trips', icon: Truck },
        { id: 'maintenance', label: 'Tyres', icon: Sliders }
      ];
    }
    // Admin
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'accounting', label: 'Accounts', icon: DollarSign },
      { id: 'borders', label: 'Borders', icon: Clock },
      { id: 'fuel', label: 'Fuel', icon: Fuel },
      { id: 'tracking', label: 'Tracking', icon: Compass }
    ];
  }, [isDriver, isAccountant, isDispatcher]);

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-[1600] backdrop-blur-lg border-t px-2 py-1 shadow-2xl pb-safe transition-colors ${
        isDark ? 'bg-[#091024]/95 border-[#1C2A4D]' : 'bg-white/95 border-slate-200'
      }`}
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'tracking'
              ? activeTab === 'dashboard' && false
              : activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'tracking') {
                  onSelectTracking();
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1.5 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? isDark
                    ? 'text-sky-400 bg-blue-600/15'
                    : 'text-blue-600 bg-blue-50 font-bold'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200 active:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${
                isActive
                  ? isDark ? 'text-sky-400 scale-105' : 'text-blue-600 scale-105'
                  : isDark ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <span className="text-[10px] leading-tight font-medium truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
