import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Search,
  Truck,
  Users,
  Compass,
  FileText,
  DollarSign,
  ChevronDown,
  Layers,
  CheckCircle2,
  Sliders,
  Calendar,
  Radio,
  Plus,
  Fuel,
  Receipt,
  Sun,
  Moon,
  TrendingUp,
  Clock,
  Wallet
} from 'lucide-react';

interface FleetbaseSidebarProps {
  onOpenTripModal?: () => void;
  onOpenFuelModal?: (truckId?: string) => void;
  onOpenExpenseModal?: (truckId?: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewMode: 'board' | 'map' | 'overview';
  setViewMode: (mode: 'board' | 'map' | 'overview') => void;
  onCloseMobileDrawer?: () => void;
}

export const FleetbaseSidebar: React.FC<FleetbaseSidebarProps> = ({
  onOpenTripModal,
  onOpenFuelModal,
  onOpenExpenseModal,
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  onCloseMobileDrawer
}) => {
  const { trucks, selectedTruckFilter, setSelectedTruckFilter } = useFleet();
  const { currentRole, isAdmin, isAccountant, isDispatcher, isDriver, assignedTruck, assignedDriverName } = useAuth();
  const { isDark, theme, setTheme } = useTheme();
  const [sidebarTab, setSidebarTab] = useState<'fleets' | 'drivers' | 'vehicles'>('fleets');
  const [searchQuery, setSearchQuery] = useState('');

  const handleNav = (tab: string, mode?: 'board' | 'map' | 'overview') => {
    setActiveTab(tab);
    if (mode) setViewMode(mode);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const navItemClass = (isActive: boolean) => {
    if (isActive) {
      return isDark
        ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30'
        : 'bg-blue-50 text-blue-700 font-bold border border-blue-200';
    }
    return isDark
      ? 'text-slate-300 hover:bg-[#131d38] hover:text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  };

  return (
    <aside className={`w-64 border-r flex flex-col text-xs shrink-0 select-none h-full transition-colors ${
      isDark ? 'bg-[#0a1124] border-[#19274a] text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
    }`}>
      {/* Search Input matching Fleetbase screenshot */}
      <div className={`p-3 border-b ${isDark ? 'border-[#19274a]' : 'border-slate-200'}`}>
        <div className="relative">
          <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder={isDriver ? "Search my trip entries..." : isAccountant ? "Search ledgers & receipts..." : "Search Fleet-Ops..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg pl-8 pr-8 py-2 text-xs border focus:outline-none focus:border-blue-500 ${
              isDark
                ? 'bg-[#111c38] border-[#1d2d54] text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
          <span className={`absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded font-mono ${
            isDark ? 'text-slate-500 bg-[#162345]' : 'text-slate-400 bg-slate-200'
          }`}>
            ⌘K
          </span>
        </div>
      </div>

      {/* Navigation Modules Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Role-Specific Navigation Groups */}
        {isDriver && (
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1.5 px-2 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Driver Cab Workflow
            </span>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('dashboard')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'dashboard'
                )}`}
              >
                <div className="flex items-center space-x-2">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  <span>My Cab Console</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isDark ? 'bg-blue-500/20 text-sky-400' : 'bg-blue-100 text-blue-800'
                }`}>
                  {assignedTruck || 'JRB 216MP'}
                </span>
              </button>

              <button
                onClick={() => handleNav('fuel')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'fuel'
                )}`}
              >
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
                <span>My Fuel Fill-ups</span>
              </button>

              <button
                onClick={() => handleNav('expenses')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'expenses'
                )}`}
              >
                <Receipt className="w-3.5 h-3.5 text-rose-500" />
                <span>My Road Expenses</span>
              </button>

              <button
                onClick={() => handleNav('petty_cash')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'petty_cash'
                )}`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>My Cash Float</span>
              </button>

              <button
                onClick={() => handleNav('borders')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'borders'
                )}`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Border Gate Assistant</span>
              </button>

              <button
                onClick={() => handleNav('files')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'files'
                )}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>My Transit Passes & PODs</span>
              </button>
            </nav>
          </div>
        )}

        {isAccountant && (
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1.5 px-2 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Finance & Accounting
            </span>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('accounting')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'accounting'
                )}`}
              >
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Financial Center</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Ledger
                </span>
              </button>

              <button
                onClick={() => handleNav('profitability')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'profitability'
                )}`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>Trip Margins & P&L</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isDark ? 'bg-blue-500/20 text-sky-400' : 'bg-blue-100 text-blue-800'
                }`}>
                  CPK
                </span>
              </button>

              <button
                onClick={() => handleNav('petty_cash')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'petty_cash'
                )}`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cash Float Ledger</span>
              </button>

              <button
                onClick={() => handleNav('expenses')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'expenses'
                )}`}
              >
                <Receipt className="w-3.5 h-3.5 text-rose-500" />
                <span>Expense & Voucher Audits</span>
              </button>

              <button
                onClick={() => handleNav('fuel')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'fuel'
                )}`}
              >
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
                <span>Fuel Purchases & Costs</span>
              </button>

              <button
                onClick={() => handleNav('reports')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'reports'
                )}`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tax & Audit Statements</span>
              </button>

              <button
                onClick={() => handleNav('files')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'files'
                )}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Proof of Payments (POPs)</span>
              </button>
            </nav>
          </div>
        )}

        {isDispatcher && (
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1.5 px-2 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Logistics & Dispatch
            </span>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNav('dashboard', 'board')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'dashboard' && viewMode === 'board'
                )}`}
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Orders Board</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isDark ? 'bg-blue-500/20 text-sky-400' : 'bg-blue-100 text-blue-800'
                }`}>
                  Live
                </span>
              </button>

              <button
                onClick={() => handleNav('dashboard', 'map')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'dashboard' && viewMode === 'map'
                )}`}
              >
                <div className="flex items-center space-x-2">
                  <Compass className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Corridor Telemetry</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  GPS
                </span>
              </button>

              <button
                onClick={() => handleNav('borders')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'borders'
                )}`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Border Delays & Gates</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800'
                }`}>
                  Dwell
                </span>
              </button>

              <button
                onClick={() => handleNav('trips')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'trips'
                )}`}
              >
                <Truck className="w-3.5 h-3.5 text-sky-500" />
                <span>All Dispatched Trips</span>
              </button>

              <button
                onClick={() => handleNav('maintenance')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'maintenance'
                )}`}
              >
                <Sliders className="w-3.5 h-3.5 text-purple-500" />
                <span>Maintenance & 6x4 Tyres</span>
              </button>

              <button
                onClick={() => handleNav('files')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                  activeTab === 'files'
                )}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Transit Waybills & PODs</span>
              </button>
            </nav>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-4">
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1.5 px-2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Executive Operations
              </span>
              <nav className="space-y-0.5">
                <button
                  onClick={() => handleNav('dashboard', 'board')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'dashboard' && viewMode === 'board'
                  )}`}
                >
                  <div className="flex items-center space-x-2">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Orders Board</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isDark ? 'bg-blue-500/20 text-sky-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    Live
                  </span>
                </button>

                <button
                  onClick={() => handleNav('dashboard', 'overview')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'dashboard' && viewMode === 'overview'
                  )}`}
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Executive Overview & KPIs</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    KPI
                  </span>
                </button>

                <button
                  onClick={() => handleNav('dashboard', 'map')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'dashboard' && viewMode === 'map'
                  )}`}
                >
                  <div className="flex items-center space-x-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Corridor Telemetry</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    GPS
                  </span>
                </button>

                <button
                  onClick={() => handleNav('borders')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'borders'
                  )}`}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Border Delays & Gates</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Dwell
                  </span>
                </button>

                <button
                  onClick={() => handleNav('trips')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'trips'
                  )}`}
                >
                  <Truck className="w-3.5 h-3.5 text-sky-500" />
                  <span>All Dispatched Trips</span>
                </button>
              </nav>
            </div>

            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1.5 px-2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Finance & Accounting
              </span>
              <nav className="space-y-0.5">
                <button
                  onClick={() => handleNav('accounting')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'accounting'
                  )}`}
                >
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Financial Center</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Audit
                  </span>
                </button>

                <button
                  onClick={() => handleNav('profitability')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'profitability'
                  )}`}
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <span>Trip Margins & P&L</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isDark ? 'bg-blue-500/20 text-sky-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    CPK
                  </span>
                </button>

                <button
                  onClick={() => handleNav('petty_cash')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'petty_cash'
                  )}`}
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Petty Cash Float</span>
                </button>

                <button
                  onClick={() => handleNav('expenses')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'expenses'
                  )}`}
                >
                  <Receipt className="w-3.5 h-3.5 text-rose-500" />
                  <span>Expense Reports</span>
                </button>

                <button
                  onClick={() => handleNav('fuel')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'fuel'
                  )}`}
                >
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fuel Purchases</span>
                </button>
              </nav>
            </div>

            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1.5 px-2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Asset & Compliance
              </span>
              <nav className="space-y-0.5">
                <button
                  onClick={() => handleNav('maintenance')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'maintenance'
                  )}`}
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-500" />
                  <span>Maintenance & 6x4 Tyres</span>
                </button>

                <button
                  onClick={() => handleNav('reports')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'reports'
                  )}`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Generate Reports</span>
                </button>

                <button
                  onClick={() => handleNav('files')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${navItemClass(
                    activeTab === 'files'
                  )}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                  <span>Files & POD Slips</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Live Operations Section matching Fleetbase screenshot */}
        <div className={`pt-2 border-t ${isDark ? 'border-[#19274a]' : 'border-slate-200'}`}>
          <div className="px-2 mb-2">
            <span className={`text-[10px] uppercase font-bold tracking-wider block ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              LIVE OPERATIONS
            </span>
            <div className={`flex items-center space-x-2 text-[11px] mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>2 drivers online</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>2 vehicles online</span>
              </span>
            </div>
          </div>

          {/* Sub-tabs: Fleets | Drivers | Vehicles */}
          <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border text-[11px] mb-2.5 ${
            isDark ? 'bg-[#111c38] border-[#1d2d54]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setSidebarTab('fleets')}
              className={`py-1 text-center font-bold rounded transition-colors ${
                sidebarTab === 'fleets'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fleets
            </button>
            <button
              onClick={() => setSidebarTab('drivers')}
              className={`py-1 text-center font-bold rounded transition-colors ${
                sidebarTab === 'drivers'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drivers
            </button>
            <button
              onClick={() => setSidebarTab('vehicles')}
              className={`py-1 text-center font-bold rounded transition-colors ${
                sidebarTab === 'vehicles'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vehicles
            </button>
          </div>

          {/* Resource Tree List */}
          <div className="space-y-1.5 text-xs">
            <div className={`border rounded-lg p-2.5 space-y-2 ${
              isDark ? 'bg-[#101933] border-[#1b2a4f]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Southern Corridor Fleet</span>
                <span className="text-[10px] text-emerald-500 font-bold">2 Active</span>
              </div>

              {trucks.map((truck) => {
                const isSelected = selectedTruckFilter === truck.registration;

                return (
                  <div
                    key={truck.registration}
                    onClick={() => {
                      if (isAdmin) {
                        setSelectedTruckFilter(isSelected ? 'ALL' : truck.registration);
                      }
                    }}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-950/40 border-blue-500/60 text-white'
                          : 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs'
                        : isDark
                          ? 'bg-[#131e3b] border-[#1d2d54] text-slate-300 hover:bg-[#162345]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="font-mono font-bold text-xs">{truck.registration}</span>
                      </div>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{truck.driver}</span>
                    </div>
                    <div className={`text-[10px] mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {truck.make}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Theme Appearance Selector (Light or Dark Mode Option) */}
      <div className={`p-3 border-t transition-colors ${
        isDark ? 'border-[#19274a] bg-[#0c1429]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            UI Theme
          </span>
          <span className="text-[10px] font-bold text-blue-600">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
        <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${
          isDark ? 'bg-[#111c38] border-[#1d2d54]' : 'bg-slate-200 border-slate-300'
        }`}>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              !isDark
                ? 'bg-white text-slate-900 shadow-sm border border-slate-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Switch to Light Mode"
          >
            <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              isDark
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Switch to Dark Mode"
          >
            <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-sky-300' : 'text-slate-500'}`} />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className={`p-3 border-t text-[10px] flex items-center justify-between ${
        isDark ? 'border-[#19274a] text-slate-500' : 'border-slate-200 text-slate-400'
      }`}>
        <span>Fleetbase v0.7.55</span>
        <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>MARVEL TIN</span>
      </div>
    </aside>
  );
};
