import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FuelLog } from '../types';
import {
  formatDateTime,
  formatDateOnly,
  convertToUSD,
  formatCurrency,
  extractTruckRegistration
} from '../utils/helpers';
import {
  Fuel,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Receipt,
  Download,
  Filter,
  Eye,
  FileText,
  RotateCcw,
  CheckCircle,
  Truck,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { ReceiptViewerModal } from './ReceiptViewerModal';

interface FuelLogsViewProps {
  onOpenFuelModal: () => void;
}

export const FuelLogsView: React.FC<FuelLogsViewProps> = ({ onOpenFuelModal }) => {
  const { fuelLogs, exchangeRates, selectedTruckFilter, setSelectedTruckFilter } = useFleet();
  const { isAdmin, assignedTruck } = useAuth();
  const { isDark } = useTheme();

  // Local filter states for the Fuel History page
  const [truckFilter, setTruckFilter] = useState<string>(
    isAdmin ? selectedTruckFilter || 'ALL' : assignedTruck || 'JRB 216MP'
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Fuel Purchase PDF Receipt');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Filter fuel logs by truck and date range
  const filteredHistory = useMemo(() => {
    return fuelLogs.filter((log) => {
      // 1. Truck filter
      const truckReg = extractTruckRegistration(log.truckId);
      if (truckFilter !== 'ALL' && truckReg !== truckFilter) {
        return false;
      }

      // 2. Date Range filter
      if (startDate || endDate) {
        const logDateObj = (log.timestamp as any)?.toDate?.() || new Date(log.timestamp as any);
        const logTime = logDateObj.getTime();

        if (startDate) {
          const startTime = new Date(startDate).setHours(0, 0, 0, 0);
          if (logTime < startTime) return false;
        }

        if (endDate) {
          const endTime = new Date(endDate).setHours(23, 59, 59, 999);
          if (logTime > endTime) return false;
        }
      }

      return true;
    });
  }, [fuelLogs, truckFilter, startDate, endDate]);

  // Aggregate stats for filtered entries
  const totalLitres = filteredHistory.reduce((acc, curr) => acc + (curr.litres || 0), 0);
  const totalSpendUSD = filteredHistory.reduce(
    (acc, curr) => acc + convertToUSD(curr.cost, curr.currency, exchangeRates),
    0
  );
  const avgCostPerLitreUSD = totalLitres > 0 ? totalSpendUSD / totalLitres : 0;

  // Preset Date Range Handlers
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
   * Dedicated Download Receipt handler ensuring immediate PDF download
   */
  const handleDownloadReceipt = async (receiptUrl: string | undefined, truckReg: string, logId: string) => {
    if (!receiptUrl) return;

    const fileName = `Fuel_Receipt_${truckReg.replace(/\s+/g, '_')}_${logId.slice(-6)}.pdf`;
    setDownloadNotice(`Downloading receipt for ${truckReg}...`);

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

      // External or Firebase Storage URL download
      const response = await fetch(receiptUrl);
      if (!response.ok) throw new Error('Network response was not ok');
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
      // Fallback in case of CORS or browser security restrictions: direct open/download
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

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Fuel className="w-6 h-6 text-amber-500" />
            <span>Fuel History</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Comprehensive fuel purchases filterable by truck and date range with downloadable PDF receipts
          </p>
        </div>

        <button
          onClick={onOpenFuelModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Log Fuel Purchase</span>
        </button>
      </div>

      {/* Download Alert Notice */}
      {downloadNotice && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-cyan-500 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 animate-bounce text-cyan-500" />
            <span>{downloadNotice}</span>
          </div>
          <button onClick={() => setDownloadNotice(null)} className="text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar: Filterable by Truck and Date Range */}
      <div className={`border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Filter className="w-4 h-4" />
            <span>Filter Fuel History</span>
          </div>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredHistory.length}</strong> of {fuelLogs.length} logs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Truck Filter */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Truck
            </label>
            {isAdmin ? (
              <select
                value={truckFilter}
                onChange={(e) => {
                  setTruckFilter(e.target.value);
                  setSelectedTruckFilter(e.target.value);
                }}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="ALL">All Trucks (JRB 216MP & KBR 813MP)</option>
                <option value="JRB 216MP">JRB 216MP — Scania R500 (Tichaona)</option>
                <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Anthony)</option>
              </select>
            ) : (
              <div className={`w-full border rounded-xl px-3 py-2 text-xs font-bold ${
                isDark ? 'bg-slate-800/80 border-slate-700/60 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {assignedTruck} (Assigned Truck)
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
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
              }}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Quick Date Range Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-slate-400 mr-1">Date Presets:</span>
          <button
            onClick={() => applyDatePreset('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-[11px] ${
              !startDate && !endDate
                ? 'bg-amber-500 text-slate-950 font-bold'
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

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`border rounded-2xl p-4 shadow-lg backdrop-blur-sm transition-colors ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Filtered Fuel Volume
          </span>
          <span className="text-2xl font-black text-amber-500 font-mono">
            {totalLitres.toLocaleString()} L
          </span>
          <span className={`text-[11px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {filteredHistory.length} total refuels logged
          </span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-lg backdrop-blur-sm transition-colors ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Fuel Expenditure
          </span>
          <span className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {formatCurrency(totalSpendUSD, 'USD')}
          </span>
          <span className={`text-[11px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            USD conversion (~R{(totalSpendUSD / (exchangeRates?.ZAR_USD || 0.055)).toFixed(0)} ZAR)
          </span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-lg backdrop-blur-sm transition-colors ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Avg Fuel Price / Litre
          </span>
          <span className="text-2xl font-black text-emerald-500 font-mono">
            ${avgCostPerLitreUSD.toFixed(2)}/L
          </span>
          <span className={`text-[11px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Regional average</span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-lg backdrop-blur-sm transition-colors ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            PDF Receipts Stored
          </span>
          <span className="text-2xl font-black text-cyan-500 font-mono">
            {filteredHistory.filter((l) => Boolean(l.receiptUrl)).length}
          </span>
          <span className={`text-[11px] block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>In Firebase Storage</span>
        </div>
      </div>

      {/* Fuel History Table / List */}
      {filteredHistory.length === 0 ? (
        <div className={`border rounded-3xl p-12 text-center transition-colors ${
          isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <Fuel className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className={`text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>No fuel purchase records found</h3>
          <p className={`text-xs max-w-sm mx-auto mt-1 mb-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            No entries matched the selected truck and date range filter.
          </p>
          <button
            onClick={onOpenFuelModal}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg"
          >
            Log Fuel Purchase
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card View (visible on small screens) */}
          <div className="block lg:hidden space-y-3">
            {filteredHistory.map((log) => {
              const truckReg = extractTruckRegistration(log.truckId);
              const isJRB = truckReg.includes('JRB');
              const usdVal = convertToUSD(log.cost, log.currency, exchangeRates);

              return (
                <div
                  key={log.id}
                  className={`border rounded-2xl p-4 shadow-lg space-y-3 transition-colors ${
                    isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-black tracking-wider px-2.5 py-1 rounded-lg border shadow-inner ${
                      isDark ? 'text-slate-200 bg-slate-950 border-slate-700/80' : 'text-blue-900 bg-blue-50 border-blue-200'
                    }`}>
                      {truckReg}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>

                  <div className={`flex items-baseline justify-between border-b pb-2 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {log.litres.toLocaleString()} Litres
                      </span>
                      <div className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {log.stationName}
                      </div>
                      {log.location && (
                        <div className={`text-[11px] flex items-center space-x-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{log.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(log.cost, log.currency)}
                      </div>
                      <div className="text-[11px] text-amber-500 font-semibold font-mono">
                        ~{formatCurrency(usdVal, 'USD')}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions: Download Receipt button on every entry */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {log.receiptUrl ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedReceipt(log.receiptUrl);
                            setPreviewTitle(`Fuel Receipt — ${log.stationName} (${truckReg})`);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                            isDark ? 'bg-slate-700 hover:bg-slate-650 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleDownloadReceipt(log.receiptUrl, truckReg, log.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-cyan-600/20 transition-all active:scale-95"
                          title="Download PDF Receipt"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Receipt</span>
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 cursor-not-allowed border ${
                          isDark ? 'bg-slate-800 text-slate-500 border-slate-700/60' : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5 opacity-40" />
                        <span>No Receipt Attached</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className={`hidden lg:block border rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm transition-colors ${
            isDark ? 'bg-slate-800/70 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase tracking-wider text-[11px] ${
                  isDark ? 'bg-slate-900/90 border-slate-700/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="px-4 py-3.5">Truck</th>
                    <th className="px-4 py-3.5">Litres Taken</th>
                    <th className="px-4 py-3.5">Fuel Station & Location</th>
                    <th className="px-4 py-3.5">Amount Paid</th>
                    <th className="px-4 py-3.5">USD Equiv.</th>
                    <th className="px-4 py-3.5">Date & Time</th>
                    <th className="px-4 py-3.5 text-right">Receipt Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                  {filteredHistory.map((log) => {
                    const truckReg = extractTruckRegistration(log.truckId);
                    const isJRB = truckReg.includes('JRB');
                    const usdVal = convertToUSD(log.cost, log.currency, exchangeRates);

                    return (
                      <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-slate-750/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3.5">
                          <span className={`font-mono text-xs font-black tracking-wider px-2 py-0.5 rounded border shadow-inner ${
                            isDark ? 'text-slate-200 bg-slate-950 border-slate-700/80' : 'text-blue-900 bg-blue-50 border-blue-200'
                          }`}>
                            {truckReg}
                          </span>
                        </td>
                        <td className={`px-4 py-3.5 font-bold font-mono text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {log.litres.toLocaleString()} L
                        </td>
                        <td className="px-4 py-3.5">
                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.stationName}</div>
                          {log.location && (
                            <div className={`text-[11px] flex items-center space-x-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{log.location}</span>
                            </div>
                          )}
                        </td>
                        <td className={`px-4 py-3.5 font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {formatCurrency(log.cost, log.currency)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-amber-500 font-semibold">
                          {formatCurrency(usdVal, 'USD')}
                        </td>
                        <td className={`px-4 py-3.5 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {log.receiptUrl ? (
                            <div className="inline-flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedReceipt(log.receiptUrl);
                                  setPreviewTitle(`Fuel Receipt — ${log.stationName} (${truckReg})`);
                                }}
                                className="p-1.5 rounded-lg bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Preview PDF Receipt"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              </button>

                              <button
                                onClick={() => handleDownloadReceipt(log.receiptUrl, truckReg, log.id)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 font-bold transition-all cursor-pointer shadow-sm text-xs"
                                title="Download PDF Receipt"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Receipt</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 border border-slate-700/50 font-medium cursor-not-allowed text-xs"
                            >
                              <Download className="w-3.5 h-3.5 opacity-40" />
                              <span>No Receipt</span>
                            </button>
                          )}
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

      {/* PDF Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        url={selectedReceipt || ''}
        title={previewTitle}
      />
    </div>
  );
};
