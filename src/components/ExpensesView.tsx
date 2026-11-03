import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { Expense, ExpenseCategory, Trip } from '../types';
import {
  formatDateTime,
  formatDateOnly,
  convertToUSD,
  formatCurrency,
  extractTruckRegistration
} from '../utils/helpers';
import {
  Receipt,
  Plus,
  Tag,
  ShieldCheck,
  Radio,
  FileCheck,
  DollarSign,
  Download,
  Filter,
  Calendar,
  RotateCcw,
  Truck,
  Route,
  Eye,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Compass
} from 'lucide-react';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import { useTheme } from '../context/ThemeContext';

interface ExpensesViewProps {
  onOpenExpenseModal: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenExpenseModal }) => {
  const { expenses, trips, exchangeRates, selectedTruckFilter, setSelectedTruckFilter } = useFleet();
  const { isAdmin, assignedTruck } = useAuth();
  const { isDark } = useTheme();

  // Filters: Truck and Date range
  const [truckFilter, setTruckFilter] = useState<string>(
    isAdmin ? selectedTruckFilter || 'ALL' : assignedTruck || 'JRB 216MP'
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');

  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Expense Receipt');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Filter expenses by truck and date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Truck filter
      const truckReg = extractTruckRegistration(exp.truckId);
      if (truckFilter !== 'ALL' && truckReg !== truckFilter) {
        return false;
      }

      // 2. Category filter
      if (selectedCategoryFilter !== 'ALL' && exp.category !== selectedCategoryFilter) {
        return false;
      }

      // 3. Date range filter
      if (startDate || endDate) {
        const expDateObj = (exp.timestamp as any)?.toDate?.() || new Date(exp.timestamp as any);
        const expTime = expDateObj.getTime();

        if (startDate) {
          const startTime = new Date(startDate).setHours(0, 0, 0, 0);
          if (expTime < startTime) return false;
        }

        if (endDate) {
          const endTime = new Date(endDate).setHours(23, 59, 59, 999);
          if (expTime > endTime) return false;
        }
      }

      return true;
    });
  }, [expenses, truckFilter, selectedCategoryFilter, startDate, endDate]);

  // Totals per truck calculations
  const totalsPerTruck = useMemo(() => {
    const res = {
      'JRB 216MP': { totalUSD: 0, count: 0, tollgate: 0, seal: 0, tracker: 0, other: 0 },
      'KBR 813MP': { totalUSD: 0, count: 0, tollgate: 0, seal: 0, tracker: 0, other: 0 },
      allUSD: 0,
    };

    filteredExpenses.forEach((exp) => {
      const truckReg = extractTruckRegistration(exp.truckId);
      const usdVal = convertToUSD(exp.amount, exp.currency, exchangeRates);
      res.allUSD += usdVal;

      if (truckReg === 'JRB 216MP' || truckReg.includes('JRB')) {
        res['JRB 216MP'].totalUSD += usdVal;
        res['JRB 216MP'].count += 1;
        if (exp.category in res['JRB 216MP']) {
          res['JRB 216MP'][exp.category] += usdVal;
        }
      } else if (truckReg === 'KBR 813MP' || truckReg.includes('KBR')) {
        res['KBR 813MP'].totalUSD += usdVal;
        res['KBR 813MP'].count += 1;
        if (exp.category in res['KBR 813MP']) {
          res['KBR 813MP'][exp.category] += usdVal;
        }
      }
    });

    return res;
  }, [filteredExpenses, exchangeRates]);

  // Group filtered expenses by Trip and then by Category
  interface TripGroup {
    tripId: string;
    tripInfo?: Trip;
    truckReg: string;
    totalUSD: number;
    categories: Record<ExpenseCategory, Expense[]>;
  }

  const groupedByTripAndCategory = useMemo(() => {
    const map = new Map<string, TripGroup>();

    filteredExpenses.forEach((exp) => {
      const rawTripId = typeof exp.tripId === 'string' ? exp.tripId : (exp.tripId as any)?.id || 'corridor_general';
      const tripKey = rawTripId && rawTripId !== 'trip_general' ? rawTripId : 'corridor_general';
      const truckReg = extractTruckRegistration(exp.truckId);
      const usdVal = convertToUSD(exp.amount, exp.currency, exchangeRates);

      if (!map.has(tripKey)) {
        const foundTrip = trips.find((t) => t.id === tripKey);
        map.set(tripKey, {
          tripId: tripKey,
          tripInfo: foundTrip,
          truckReg: foundTrip ? extractTruckRegistration(foundTrip.truckId) : truckReg,
          totalUSD: 0,
          categories: {
            tollgate: [],
            seal: [],
            tracker: [],
            other: [],
          },
        });
      }

      const group = map.get(tripKey)!;
      group.totalUSD += usdVal;
      if (group.categories[exp.category]) {
        group.categories[exp.category].push(exp);
      } else {
        group.categories.other.push(exp);
      }
    });

    return Array.from(map.values());
  }, [filteredExpenses, trips, exchangeRates]);

  // Date Presets Handler
  const applyDatePreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }
    if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 86400000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      return;
    }
    if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 86400000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      return;
    }
    if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      return;
    }
  };

  /**
   * Dedicated Download Receipt handler
   */
  const handleDownloadReceipt = async (receiptUrl: string | undefined, truckReg: string, expId: string, category: string) => {
    if (!receiptUrl) return;

    const fileExt = receiptUrl.includes('.pdf') || receiptUrl.startsWith('data:application/pdf') ? 'pdf' : 'jpg';
    const fileName = `Expense_Receipt_${truckReg.replace(/\s+/g, '_')}_${category}_${expId.slice(-6)}.${fileExt}`;
    setDownloadNotice(`Downloading receipt for ${truckReg} (${category})...`);

    try {
      if (receiptUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = receiptUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setDownloadNotice(null), 3000);
        return;
      }

      // External or Firebase Storage URL
      const response = await fetch(receiptUrl);
      if (!response.ok) throw new Error('Network error');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setTimeout(() => setDownloadNotice(null), 3000);
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.href = receiptUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloadNotice(null), 3000);
    }
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'tollgate':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 capitalize">
            <span>Tollgate</span>
          </span>
        );
      case 'seal':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 capitalize">
            <span>Customs Seal</span>
          </span>
        );
      case 'tracker':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 capitalize">
            <span>Satellite Tracker</span>
          </span>
        );
      case 'other':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-300 border border-slate-500/30 capitalize">
            <span>Other Expense</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Receipt className="w-6 h-6 text-blue-500" />
            <span>Expense Report & Per-Trip Cost Controls</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Per-trip operational costs grouped by trip and category with totals per truck and downloadable receipts
          </p>
        </div>

        <button
          onClick={onOpenExpenseModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 cursor-pointer self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Log Route Expense</span>
        </button>
      </div>

      {/* Download Status Toast */}
      {downloadNotice && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-cyan-500 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 animate-bounce text-cyan-500" />
            <span>{downloadNotice}</span>
          </div>
          <button onClick={() => setDownloadNotice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* 4. Filter Toolbar: View Expenses by Truck and Date Range */}
      <div className={`border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-500">
            <Filter className="w-4 h-4" />
            <span>Filter Expenses</span>
          </div>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredExpenses.length}</strong> recorded expense items
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Truck Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Truck
            </label>
            {isAdmin ? (
              <select
                value={truckFilter}
                onChange={(e) => {
                  setTruckFilter(e.target.value);
                  setSelectedTruckFilter(e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Trucks (JRB 216MP & KBR 813MP)</option>
                <option value="JRB 216MP">JRB 216MP — Scania R500 (Tichaona)</option>
                <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Anthony)</option>
              </select>
            ) : (
              <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-blue-300 font-bold">
                {assignedTruck} (Assigned Truck)
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                if (isAdmin) setTruckFilter('ALL');
                setStartDate('');
                setEndDate('');
                setSelectedCategoryFilter('ALL');
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-slate-400 mr-1">Date Presets:</span>
          <button
            onClick={() => applyDatePreset('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-[11px] ${
              !startDate && !endDate
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => applyDatePreset('today')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={() => applyDatePreset('7days')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => applyDatePreset('30days')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyDatePreset('thisMonth')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            This Month
          </button>
        </div>
      </div>

      {/* 3. Totals Per Truck Cards */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Expense Totals Per Truck (Filtered Period)</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Combined Total: <strong className="text-white font-mono">{formatCurrency(totalsPerTruck.allUSD, 'USD')}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Truck 1: JRB 216MP */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-black tracking-wider text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-inner">
                  JRB 216MP
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">Scania R500 V8</h3>
                  <span className="text-[11px] text-slate-400">Driver: Tichaona</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatCurrency(totalsPerTruck['JRB 216MP'].totalUSD, 'USD')}
                </div>
                <div className="text-[11px] text-amber-400 font-semibold font-mono">
                  ~R{(totalsPerTruck['JRB 216MP'].totalUSD / (exchangeRates?.ZAR_USD || 0.055)).toFixed(0)} ZAR
                </div>
              </div>
            </div>

            {/* Category breakdown for JRB 216MP */}
            <div className="grid grid-cols-4 gap-2 pt-3 text-center">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-blue-400 font-bold block uppercase">Tolls</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['JRB 216MP'].tollgate.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 font-bold block uppercase">Seals</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['JRB 216MP'].seal.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-purple-400 font-bold block uppercase">Tracker</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['JRB 216MP'].tracker.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Other</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['JRB 216MP'].other.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Truck 2: KBR 813MP */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-black tracking-wider text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-inner">
                  KBR 813MP
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">Volvo FH16</h3>
                  <span className="text-[11px] text-slate-400">Driver: Anthony</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatCurrency(totalsPerTruck['KBR 813MP'].totalUSD, 'USD')}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold font-mono">
                  ~R{(totalsPerTruck['KBR 813MP'].totalUSD / (exchangeRates?.ZAR_USD || 0.055)).toFixed(0)} ZAR
                </div>
              </div>
            </div>

            {/* Category breakdown for KBR 813MP */}
            <div className="grid grid-cols-4 gap-2 pt-3 text-center">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-blue-400 font-bold block uppercase">Tolls</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['KBR 813MP'].tollgate.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 font-bold block uppercase">Seals</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['KBR 813MP'].seal.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-purple-400 font-bold block uppercase">Tracker</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['KBR 813MP'].tracker.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Other</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${totalsPerTruck['KBR 813MP'].other.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grouped by Trip and Category */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Per-Trip Expense Reports ({groupedByTripAndCategory.length} Trip Dispatches)</span>
          </h2>
        </div>

        {groupedByTripAndCategory.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No expenses found for this filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Try adjusting your truck selection or date range, or record a new route expense.
            </p>
            <button
              onClick={onOpenExpenseModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg"
            >
              Log Route Expense
            </button>
          </div>
        ) : (
          groupedByTripAndCategory.map((tripGroup) => {
            const isGeneral = tripGroup.tripId === 'corridor_general' || !tripGroup.tripInfo;
            const tripTitle = isGeneral
              ? 'General Corridor Transit & Border Operations'
              : `${tripGroup.tripInfo?.origin.split(',')[0]} → ${tripGroup.tripInfo?.destination.split(',')[0]}`;
            const isJRB = tripGroup.truckReg.includes('JRB');

            const allCategories: ExpenseCategory[] = ['tollgate', 'seal', 'tracker', 'other'];

            return (
              <div
                key={tripGroup.tripId}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md"
              >
                {/* Trip Group Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-800/90 via-slate-800/60 to-slate-850 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                      <Route className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                          {tripGroup.truckReg}
                        </span>
                        <h3 className="font-bold text-base sm:text-lg text-white">
                          {tripTitle}
                        </h3>
                        {tripGroup.tripInfo && (
                          <span className="text-xs text-slate-400 font-medium capitalize">
                            · {tripGroup.tripInfo.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tripGroup.tripInfo ? (
                          <>
                            Driver: <strong className="text-slate-300">{tripGroup.tripInfo.driver}</strong> • Corridor Dispatch:{' '}
                            {formatDateOnly(tripGroup.tripInfo.startDate)}
                          </>
                        ) : (
                          'Unassigned or Multi-leg Corridor Route Costs'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Trip Total Cost */}
                  <div className="text-left sm:text-right shrink-0 bg-slate-900/60 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-slate-800 sm:border-0">
                    <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                      Trip Subtotal
                    </span>
                    <span className="text-xl font-black text-white font-mono">
                      {formatCurrency(tripGroup.totalUSD, 'USD')}
                    </span>
                  </div>
                </div>

                {/* Categories inside this Trip */}
                <div className="p-4 sm:p-5 space-y-5">
                  {allCategories.map((cat) => {
                    const items = tripGroup.categories[cat] || [];
                    if (items.length === 0) return null;

                    const catSubtotalUSD = items.reduce(
                      (acc, curr) => acc + convertToUSD(curr.amount, curr.currency, exchangeRates),
                      0
                    );

                    return (
                      <div key={cat} className="space-y-2.5">
                        {/* Category Heading & Subtotal */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-2">
                            {getCategoryBadge(cat)}
                            <span className="text-xs text-slate-400 font-medium">
                              ({items.length} {items.length === 1 ? 'entry' : 'entries'})
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-300 font-mono">
                            Subtotal: {formatCurrency(catSubtotalUSD, 'USD')}
                          </span>
                        </div>

                        {/* List of expenses with prominent Download Receipt button on every entry */}
                        <div className="grid grid-cols-1 gap-2.5">
                          {items.map((exp) => {
                            const truckReg = extractTruckRegistration(exp.truckId);
                            const usdVal = convertToUSD(exp.amount, exp.currency, exchangeRates);

                            return (
                              <div
                                key={exp.id}
                                className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl p-3.5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                              >
                                {/* Left Info */}
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-bold text-white">
                                      {exp.description}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                    <span>
                                      Date: <strong className="text-slate-300">{formatDateTime(exp.timestamp)}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Truck: <span className="text-slate-300 font-mono">{truckReg}</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Amounts & "Download Receipt" Button */}
                                <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/50">
                                  <div className="text-left md:text-right">
                                    <div className="text-base font-bold text-white font-mono">
                                      {formatCurrency(exp.amount, exp.currency)}
                                    </div>
                                    <div className="text-[11px] text-blue-400 font-semibold font-mono">
                                      ~{formatCurrency(usdVal, 'USD')}
                                    </div>
                                  </div>

                                  {/* Download Receipt Button on EVERY entry */}
                                  <div className="flex items-center space-x-2">
                                    {exp.receiptUrl ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setSelectedReceipt(exp.receiptUrl);
                                            setPreviewTitle(`${exp.description} (${truckReg})`);
                                          }}
                                          className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                                          title="Preview Receipt"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                        </button>

                                        <button
                                          onClick={() => handleDownloadReceipt(exp.receiptUrl, truckReg, exp.id, exp.category)}
                                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                                          title="Download Receipt (PDF or Image)"
                                        >
                                          <Download className="w-4 h-4" />
                                          <span>Download Receipt</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        disabled
                                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-500 border border-slate-700/50 text-xs font-medium cursor-not-allowed"
                                        title="No receipt file was attached for this item"
                                      >
                                        <Download className="w-3.5 h-3.5 opacity-40" />
                                        <span>No Receipt</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        url={selectedReceipt || ''}
        title={previewTitle}
      />
    </div>
  );
};
