import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFleet } from '../context/FleetContext';
import {
  Truck,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  TrendingUp,
  Filter,
  Radio,
  Zap,
  Menu,
  X,
  Wifi,
  WifiOff,
  Database,
  Sun,
  Moon,
  DollarSign
} from 'lucide-react';
import { ExchangeRatesModal } from './ExchangeRatesModal';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickAction?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickAction,
  onToggleSidebar
}) => {
  const {
    user,
    profile,
    currentRole,
    isSuperAdmin,
    isAdmin,
    isAccountant,
    isDispatcher,
    isDriver,
    assignedTruck,
    assignedDriverName,
    signInWithGoogle,
    signOut,
    switchRoleOrTruck
  } = useAuth();
  const { selectedTruckFilter, setSelectedTruckFilter, exchangeRates } = useFleet();
  const { theme, toggleTheme, isDark } = useTheme();

  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const network = useNetworkStatus();

  // Dynamic Navigation Tabs strictly partitioned by user role
  const tabs = React.useMemo(() => {
    if (isDriver) {
      return [
        { id: 'dashboard', label: 'In-Cab Console' },
        { id: 'fuel', label: 'My Fuel Logs' },
        { id: 'expenses', label: 'Road Expenses' },
        { id: 'petty_cash', label: 'My Cash Float' },
        { id: 'borders', label: 'Border Gates' },
        { id: 'files', label: 'Waybills & PODs' },
      ];
    }
    if (isAccountant) {
      return [
        { id: 'accounting', label: 'Financial Center' },
        { id: 'profitability', label: 'Margins & P&L' },
        { id: 'petty_cash', label: 'Cash Float Ledger' },
        { id: 'expenses', label: 'Expense Audits' },
        { id: 'fuel', label: 'Fuel Costs' },
        { id: 'reports', label: 'Tax & Compliance' },
        { id: 'files', label: 'Proof of Payments' },
      ];
    }
    if (isDispatcher) {
      return [
        { id: 'dashboard', label: 'Orders Board' },
        { id: 'borders', label: 'Border Gates & Dwell' },
        { id: 'trips', label: 'Dispatches' },
        { id: 'maintenance', label: 'Tyres & Service' },
        { id: 'files', label: 'Transit Waybills' },
      ];
    }
    // Executive Admin view (comprehensive access)
    return [
      { id: 'dashboard', label: 'Executive Board' },
      { id: 'accounting', label: 'Financial Center' },
      { id: 'profitability', label: 'Margins & P&L' },
      { id: 'borders', label: 'Border Gates' },
      { id: 'trips', label: 'Trips' },
      { id: 'fuel', label: 'Fuel History' },
      { id: 'expenses', label: 'Expenses' },
      { id: 'petty_cash', label: 'Petty Cash' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'reports', label: 'Reports' },
      { id: 'files', label: 'Files' },
    ];
  }, [isDriver, isAccountant, isDispatcher]);

  return (
    <>
      <header className="sticky top-0 z-[1500]">
        {/* Top Operational Bar: Adapts between Deep Navy and Crisp White */}
        <div className={`border-b transition-colors ${
          isDark
            ? 'bg-[#081024] border-[#162345] text-white shadow-lg'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo, Sidebar Toggle & Company Branding */}
              <div className="flex items-center space-x-3">
                {onToggleSidebar && (
                  <button
                    onClick={onToggleSidebar}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#111c38] hover:bg-[#18274d] border-[#1e2e54] text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                    aria-label="Toggle navigation sidebar"
                    title="Toggle Sidebar"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-blue-500/20">
                  <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                    isDark ? 'bg-[#081024]' : 'bg-slate-50'
                  }`}>
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className={`font-black tracking-wider text-base sm:text-lg ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      MARVEL TIN
                    </span>
                    <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                      FLEET-OPS
                    </span>
                  </div>
                  <div className={`text-[11px] font-medium tracking-tight ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Cross-Border Haulage • Southern Africa Corridors
                  </div>
                </div>
              </div>

              {/* Offline Persistence Indicator & Live Exchange Rate Ticker */}
              <div className="hidden md:flex items-center space-x-2.5">
                <button
                  onClick={network.toggleSimulatedOffline}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    network.isOnline
                      ? isDark
                        ? 'bg-slate-800/80 hover:bg-slate-800 border-emerald-500/40 text-emerald-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
                  }`}
                  title="Click to toggle simulated offline mode for testing"
                >
                  {network.isOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>{network.isOnline ? 'Online (IndexedDB Sync)' : 'Offline (Local Cache)'}</span>
                </button>

                <button
                  onClick={() => setRatesModalOpen(true)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer group ${
                    isDark
                      ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className={isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>FX:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    1 ZAR = ${exchangeRates?.ZAR_USD || '0.055'}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-mono text-blue-500 font-medium">
                    1 BWP = R{exchangeRates?.BWP_ZAR || '1.35'}
                  </span>
                </button>
              </div>

              {/* Right Controls: Theme Toggle (Dark Mode Concept Switcher), Role & Auth */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Theme Mode Toggle Button (Light/Dark Concept) */}
                <button
                  onClick={toggleTheme}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                    isDark
                      ? 'bg-[#181B24] hover:bg-[#1E2330] border-white/10 text-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode Concept`}
                  aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode Concept`}
                >
                  {isDark ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span className="inline text-amber-200 font-bold">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-600" />
                      <span className="inline text-slate-800 font-bold">Dark Overview</span>
                    </>
                  )}
                </button>
                {/* Role Indicator / Switcher: Strictly Executive Admin gets dropdown; other roles have fixed identity badge */}
                {(() => {
                  const isExecutiveAdmin = isSuperAdmin || user?.email === 'swedyj16@gmail.com' || user?.uid === 'demo_admin_uid' || (isAdmin && !profile?.phoneNumber);

                  if (!isExecutiveAdmin) {
                    return (
                      <div
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                          isDark
                            ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                            : 'bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                        title="Assigned Role Identity"
                      >
                        {isAccountant ? (
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        ) : isDispatcher ? (
                          <Truck className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="hidden sm:inline">
                          {isAccountant
                            ? 'Fleet Accountant'
                            : isDispatcher
                              ? 'Operations Dispatcher'
                              : `Driver: ${assignedDriverName || 'Operator'} (${assignedTruck || 'JRB 216MP'})`}
                        </span>
                        <span className="sm:hidden">
                          {isAccountant
                            ? 'Accounts'
                            : isDispatcher
                              ? 'Dispatch'
                              : assignedTruck?.split(' ')[0] || 'Driver'}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="relative">
                      <button
                        onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          isDark
                            ? 'bg-blue-950/60 border-blue-500/40 text-blue-200 hover:bg-blue-900/60'
                            : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                        }`}
                        title="Executive Admin: Switch Perspective"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className="hidden sm:inline">Executive Admin</span>
                        <span className="sm:hidden">Admin</span>
                        <span className="text-[10px] text-slate-400">▼</span>
                      </button>

                      {/* Role Switcher Menu (Executive Admin only) */}
                      {roleMenuOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 z-[2000] text-xs text-slate-800">
                          <div className="px-3 py-2 border-b border-slate-100 text-slate-500">
                            <span className="font-bold text-slate-900 block text-xs">Executive Role / Truck View</span>
                            <span className="text-[11px]">Audit perspectives across administration, accounting, dispatch, and driver cab.</span>
                          </div>

                          <button
                            onClick={() => {
                              switchRoleOrTruck('admin');
                              setSelectedTruckFilter('ALL');
                              setActiveTab('dashboard');
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2.5 mt-1 cursor-pointer transition-colors ${
                              isAdmin
                                ? 'bg-slate-900 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <ShieldCheck className={`w-4 h-4 ${isAdmin ? 'text-sky-300' : 'text-slate-600'}`} />
                            <div>
                              <div className="font-bold">Executive Administrator</div>
                              <div className={`text-[10px] ${isAdmin ? 'text-slate-300' : 'text-slate-500'}`}>Full fleet management & executive access</div>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              switchRoleOrTruck('accountant');
                              setSelectedTruckFilter('ALL');
                              setActiveTab('accounting');
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2.5 mt-1 cursor-pointer transition-colors ${
                              isAccountant
                                ? 'bg-slate-900 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <DollarSign className={`w-4 h-4 ${isAccountant ? 'text-emerald-300' : 'text-emerald-600'}`} />
                            <div>
                              <div className="font-bold">Fleet Accountant / Controller</div>
                              <div className={`text-[10px] ${isAccountant ? 'text-slate-300' : 'text-slate-500'}`}>P&L, float reconciliation, voucher audits, tax</div>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              switchRoleOrTruck('dispatcher');
                              setSelectedTruckFilter('ALL');
                              setActiveTab('dashboard');
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2.5 mt-1 cursor-pointer transition-colors ${
                              isDispatcher
                                ? 'bg-slate-900 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Truck className={`w-4 h-4 ${isDispatcher ? 'text-sky-300' : 'text-sky-600'}`} />
                            <div>
                              <div className="font-bold">Operations Dispatcher</div>
                              <div className={`text-[10px] ${isDispatcher ? 'text-slate-300' : 'text-slate-500'}`}>Orders board, GPS telematics, border dwell, tyres</div>
                            </div>
                          </button>

                          <div className="my-1 border-t border-slate-100 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 py-0.5">
                              In-Cab Driver Consoles
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              switchRoleOrTruck('driver', 'JRB 216MP', 'Tichaona');
                              setSelectedTruckFilter('JRB 216MP');
                              setActiveTab('dashboard');
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2.5 cursor-pointer transition-colors ${
                              isDriver && assignedTruck === 'JRB 216MP'
                                ? 'bg-slate-900 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <UserCheck className={`w-4 h-4 ${isDriver && assignedTruck === 'JRB 216MP' ? 'text-sky-300' : 'text-slate-600'}`} />
                            <div>
                              <div className="font-bold">Driver Tichaona (JRB 216MP)</div>
                              <div className={`text-[10px] ${isDriver && assignedTruck === 'JRB 216MP' ? 'text-slate-300' : 'text-slate-500'}`}>Scania R500 • Harare/Durban cab console</div>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              switchRoleOrTruck('driver', 'KBR 813MP', 'Anthony');
                              setSelectedTruckFilter('KBR 813MP');
                              setActiveTab('dashboard');
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-2.5 mt-1 cursor-pointer transition-colors ${
                              isDriver && assignedTruck === 'KBR 813MP'
                                ? 'bg-slate-900 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <UserCheck className={`w-4 h-4 ${isDriver && assignedTruck === 'KBR 813MP' ? 'text-sky-300' : 'text-slate-600'}`} />
                            <div>
                              <div className="font-bold">Driver Anthony (KBR 813MP)</div>
                              <div className={`text-[10px] ${isDriver && assignedTruck === 'KBR 813MP' ? 'text-slate-300' : 'text-slate-500'}`}>Volvo FH16 • Joburg/Lusaka cab console</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sign in with Google / User avatar */}
                {user ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-300">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        user.email?.[0].toUpperCase() || 'U'
                      )}
                    </div>
                    <button
                      onClick={signOut}
                      title="Sign Out"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 cursor-pointer transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-header: Navigation Bar & Truck Filter (Adapts to Light / Dark) */}
        <div className={`border-b px-4 sm:px-6 lg:px-8 transition-colors ${
          isDark
            ? 'bg-[#0B142B] border-[#18264A] shadow-md'
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between py-2 gap-3">
            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 overflow-x-auto py-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-[#121E3E]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Truck Filter Selector: Segmented Control */}
            <div className="flex items-center space-x-2 text-xs">
              <span className={`flex items-center space-x-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Filter:</span>
              </span>

              {isAdmin ? (
                <div className={`flex items-center p-0.5 rounded-lg border ${
                  isDark ? 'bg-[#101A35] border-[#1C2C54]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    onClick={() => setSelectedTruckFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      selectedTruckFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Fleet (2)
                  </button>
                  <button
                    onClick={() => setSelectedTruckFilter('JRB 216MP')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      selectedTruckFilter === 'JRB 216MP'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    JRB 216MP
                  </button>
                  <button
                    onClick={() => setSelectedTruckFilter('KBR 813MP')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      selectedTruckFilter === 'KBR 813MP'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    KBR 813MP
                  </button>
                </div>
              ) : (
                <div className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center space-x-1 border font-bold ${
                  isDark
                    ? 'bg-blue-900/30 border-blue-500/30 text-sky-300'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <span>Assigned: {assignedTruck}</span>
                </div>
              )}

              {/* Truck Filter End */}
            </div>
          </div>

        </div>
      </header>

      {/* Exchange Rates & Currency Converter Modal */}
      <ExchangeRatesModal isOpen={ratesModalOpen} onClose={() => setRatesModalOpen(false)} />
    </>
  );
};
