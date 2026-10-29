import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PettyCash, PettyCashType } from '../types';
import {
  formatDateTime,
  formatDateOnly,
  formatCurrency,
  convertToUSD,
  extractTruckRegistration
} from '../utils/helpers';
import {
  Wallet,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Link as LinkIcon,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Search,
  RotateCcw,
  Receipt,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

interface PettyCashViewProps {
  onOpenPettyCashModal: () => void;
}

export const PettyCashView: React.FC<PettyCashViewProps> = ({ onOpenPettyCashModal }) => {
  const {
    pettyCash,
    expenses,
    calculatePettyCashBalance,
    getReconciliationReport,
    exchangeRates,
    selectedTruckFilter,
    setSelectedTruckFilter
  } = useFleet();
  const { isAdmin, assignedTruck } = useAuth();
  const { isDark } = useTheme();

  // Filters
  const [truckFilter, setTruckFilter] = useState<string>(
    isAdmin ? selectedTruckFilter || 'ALL' : assignedTruck || 'JRB 216MP'
  );
  const [typeFilter, setTypeFilter] = useState<'ALL' | PettyCashType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Per-truck balances and reconciliation
  const jrbRecon = getReconciliationReport('JRB 216MP');
  const kbrRecon = getReconciliationReport('KBR 813MP');

  const jrbBalance = calculatePettyCashBalance('JRB 216MP');
  const kbrBalance = calculatePettyCashBalance('KBR 813MP');

  // Filtered transaction ledger
  const filteredLedger = useMemo(() => {
    return pettyCash.filter((item) => {
      const truckReg = extractTruckRegistration(item.truckId);

      // Truck filter
      if (truckFilter !== 'ALL' && truckReg !== truckFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = String(item.linkedExpenseId || '').toLowerCase().includes(q);
        const truckMatch = truckReg.toLowerCase().includes(q);
        const typeMatch = item.type.toLowerCase().includes(q);
        if (!descMatch && !truckMatch && !typeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [pettyCash, truckFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Wallet className="w-6 h-6 text-emerald-500" />
            <span>Petty Cash Module & Running Float Ledger</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time cash balances per truck, automatic route expense deductions, and strict audit reconciliation
          </p>
        </div>

        <button
          onClick={onOpenPettyCashModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Log Float Top-Up</span>
        </button>
      </div>

      {/* Float Balance Banners for Each Truck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Truck 1: JRB 216MP */}
        <div className={`border rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm transition-colors ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-slate-700/80'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
            <div className="flex items-center space-x-2.5">
              <span className={`font-mono text-xs font-black tracking-wider px-2.5 py-1 rounded-lg border shadow-inner ${
                isDark ? 'text-amber-400 bg-slate-950 border-slate-700/80' : 'text-blue-900 bg-blue-50 border-blue-200'
              }`}>
                JRB 216MP
              </span>
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Scania R500</h3>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Driver: Tichaona</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Float</span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className={`text-xs block font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Available Cash Balance
              </span>
              <div className={`text-3xl font-black font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(jrbBalance, 'USD')}
              </div>
              <div className="text-[11px] text-amber-500 font-semibold font-mono mt-0.5">
                ~R{(jrbBalance / (exchangeRates?.ZAR_USD || 0.055)).toFixed(0)} ZAR
              </div>
            </div>

            <button
              onClick={onOpenPettyCashModal}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              + Top Up
            </button>
          </div>

          {/* Breakdown Stats */}
          <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-950/40' : 'bg-slate-50 border border-slate-200'}`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Top-Ups Disbursed</span>
              <span className="text-emerald-500 font-bold font-mono">
                +{formatCurrency(jrbRecon.totalTopUpsUSD, 'USD')}
              </span>
            </div>
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-950/40' : 'bg-slate-50 border border-slate-200'}`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Route Expenses Deducted</span>
              <span className="text-rose-500 font-bold font-mono">
                -{formatCurrency(jrbRecon.totalExpensesUSD, 'USD')}
              </span>
            </div>
          </div>
        </div>

        {/* Truck 2: KBR 813MP */}
        <div className={`border rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm transition-colors ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-slate-700/80'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
            <div className="flex items-center space-x-2.5">
              <span className={`font-mono text-xs font-black tracking-wider px-2.5 py-1 rounded-lg border shadow-inner ${
                isDark ? 'text-emerald-400 bg-slate-950 border-slate-700/80' : 'text-emerald-900 bg-emerald-50 border-emerald-200'
              }`}>
                KBR 813MP
              </span>
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Volvo FH16</h3>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Driver: Anthony</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Float</span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className={`text-xs block font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Available Cash Balance
              </span>
              <div className={`text-3xl font-black font-mono mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(kbrBalance, 'USD')}
              </div>
              <div className="text-[11px] text-emerald-500 font-semibold font-mono mt-0.5">
                ~R{(kbrBalance / (exchangeRates?.ZAR_USD || 0.055)).toFixed(0)} ZAR
              </div>
            </div>

            <button
              onClick={onOpenPettyCashModal}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              + Top Up
            </button>
          </div>

          {/* Breakdown Stats */}
          <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-950/40' : 'bg-slate-50 border border-slate-200'}`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Top-Ups Disbursed</span>
              <span className="text-emerald-500 font-bold font-mono">
                +{formatCurrency(kbrRecon.totalTopUpsUSD, 'USD')}
              </span>
            </div>
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-950/40' : 'bg-slate-50 border border-slate-200'}`}>
              <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Route Expenses Deducted</span>
              <span className="text-rose-500 font-bold font-mono">
                -{formatCurrency(kbrRecon.totalExpensesUSD, 'USD')}
              </span>
          </div>
        </div>
      </div>
    </div>

      {/* 3. Reconciliation & Audit Engine Panel */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">
                Petty Cash Audit & Expenses Reconciliation Engine
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              The petty cash balance is automatically reconciled with all toll, seal, and tracker expenses in the expenses collection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">
                Expenses Deducted: <strong className="text-white font-mono">{expenses.length}</strong> items
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Reconciled with Expenses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Filter className="w-4 h-4" />
            <span>Filter Running Ledger</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Showing <strong className="text-white">{filteredLedger.length}</strong> transactions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Fleet (JRB 216MP & KBR 813MP)</option>
                <option value="JRB 216MP">JRB 216MP — Scania R500 (Tichaona)</option>
                <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Anthony)</option>
              </select>
            ) : (
              <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold">
                {assignedTruck} (Assigned Truck)
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Ledger Entries</option>
              <option value="top_up">Top-Ups (Deposits) Only</option>
              <option value="expense_deduction">Expense Deductions Only</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Search Description / Ref
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search toll, seal, depot float..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Running Transaction Ledger History */}
      {filteredLedger.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No petty cash transactions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Record a top-up float deposit or log an expense in the Expense module to see running ledger entries.
          </p>
          <button
            onClick={onOpenPettyCashModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg"
          >
            Log Float Top-Up
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {filteredLedger.map((item) => {
              const truckReg = extractTruckRegistration(item.truckId);
              const isJRB = truckReg.includes('JRB');
              const isTopUp = item.type === 'top_up';

              return (
                <div
                  key={item.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                        isJRB ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {truckReg}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <div>
                      {isTopUp ? (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
                          <ArrowDownRight className="w-4 h-4" />
                          <span>Float Top-Up</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>Expense Deduction</span>
                        </span>
                      )}
                      <div className="text-xs text-slate-300 font-medium mt-0.5">
                        {item.linkedExpenseId ? String(item.linkedExpenseId) : 'Float Top-Up'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-base font-black font-mono ${
                          isTopUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isTopUp ? '+' : '-'} {formatCurrency(item.amount, item.currency)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Bal After: {formatCurrency(item.balanceAfter, item.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Truck</th>
                    <th className="px-4 py-3.5">Transaction Type</th>
                    <th className="px-4 py-3.5">Disbursement / Cost</th>
                    <th className="px-4 py-3.5">Updated Balance After</th>
                    <th className="px-4 py-3.5">Linked Expense / Source</th>
                    <th className="px-4 py-3.5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredLedger.map((item) => {
                    const truckReg = extractTruckRegistration(item.truckId);
                    const isJRB = truckReg.includes('JRB');
                    const isTopUp = item.type === 'top_up';

                    return (
                      <tr key={item.id} className="hover:bg-slate-750/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-black text-[11px] ${
                              isJRB ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                            }`}
                          >
                            {truckReg}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isTopUp ? (
                            <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 text-xs">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              <span>Float Top-Up</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 text-xs">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Expense Deduction</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold font-mono text-sm">
                          <span className={isTopUp ? 'text-emerald-400' : 'text-slate-200'}>
                            {isTopUp ? '+' : '-'} {formatCurrency(item.amount, item.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-white font-bold text-sm">
                          {formatCurrency(item.balanceAfter, item.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {item.linkedExpenseId ? (
                            <div className="flex items-center space-x-1.5 max-w-xs truncate">
                              <LinkIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{String(item.linkedExpenseId)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Float Deposit</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                          {formatDateTime(item.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
