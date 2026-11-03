import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { Maintenance } from '../types';
import {
  formatDateTime,
  formatDateOnly,
  convertToUSD,
  convertToZAR,
  formatCurrency,
  extractTruckRegistration
} from '../utils/helpers';
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Truck,
  DollarSign,
  Filter,
  Calendar,
  Search,
  Download,
  Eye,
  RotateCcw,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import { useTheme } from '../context/ThemeContext';

interface MaintenanceViewProps {
  onOpenMaintenanceModal: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onOpenMaintenanceModal }) => {
  const { maintenance, exchangeRates, trucks, updateTruckStatus, updateTruckTyres, selectedTruckFilter, setSelectedTruckFilter } = useFleet();
  const { isAdmin, assignedTruck } = useAuth();
  const { isDark } = useTheme();

  // Filters state
  const [truckFilter, setTruckFilter] = useState<string>(
    isAdmin ? selectedTruckFilter || 'ALL' : assignedTruck || 'JRB 216MP'
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tyre matrix state
  const [expandedTyresTruck, setExpandedTyresTruck] = useState<string | null>(null);
  const [editingTyreIdx, setEditingTyreIdx] = useState<{ truckReg: string; idx: number } | null>(null);
  const [tyreDepthInput, setTyreDepthInput] = useState<string>('');
  const [tyrePsiInput, setTyrePsiInput] = useState<string>('');

  // Receipt viewer state
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('Maintenance Job Card Receipt');

  // Filter maintenance records by truck, date range, and search query
  const filteredRecords = useMemo(() => {
    return maintenance.filter((record) => {
      const truckReg = extractTruckRegistration(record.truckId);

      // 1. Truck filter
      if (truckFilter !== 'ALL' && truckReg !== truckFilter) {
        return false;
      }

      // 2. Date Range filter
      if (startDate || endDate) {
        const recordDate =
          record.timestamp && typeof record.timestamp === 'object' && 'toDate' in record.timestamp
            ? (record.timestamp as any).toDate()
            : new Date(String(record.timestamp));

        if (!isNaN(recordDate.getTime())) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (recordDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (recordDate > end) return false;
          }
        }
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = record.description.toLowerCase().includes(q);
        const truckMatch = truckReg.toLowerCase().includes(q);
        const tripMatch = String(record.tripId || '').toLowerCase().includes(q);
        if (!descMatch && !truckMatch && !tripMatch) {
          return false;
        }
      }

      return true;
    });
  }, [maintenance, truckFilter, startDate, endDate, searchQuery]);

  // Aggregate metrics
  const totalCostUSD = useMemo(() => {
    return filteredRecords.reduce(
      (acc, curr) => acc + convertToUSD(curr.cost, curr.currency, exchangeRates),
      0
    );
  }, [filteredRecords, exchangeRates]);

  const totalCostZAR = useMemo(() => {
    return filteredRecords.reduce(
      (acc, curr) => acc + convertToZAR(curr.cost, curr.currency, exchangeRates),
      0
    );
  }, [filteredRecords, exchangeRates]);

  // Quick date preset handlers
  const handleSetDatePreset = (preset: 'all' | 'today' | '7days' | '30days' | 'this_month') => {
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const d = formatYMD(today);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(today));
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(today));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatYMD(firstDay));
      setEndDate(formatYMD(today));
    }
  };

  const resetFilters = () => {
    setTruckFilter(isAdmin ? 'ALL' : assignedTruck || 'JRB 216MP');
    if (isAdmin) setSelectedTruckFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  /**
   * Direct download handler for receipts (PDFs or images)
   */
  const handleDownloadReceipt = (record: Maintenance) => {
    if (!record.receiptUrl) return;

    const truckReg = extractTruckRegistration(record.truckId);
    const fileName = `Maintenance_Receipt_${truckReg.replace(/\s+/g, '_')}_${record.id.slice(-6)}.pdf`;

    try {
      const link = document.createElement('a');
      link.href = record.receiptUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(record.receiptUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Wrench className="w-6 h-6 text-rose-500" />
            <span>Maintenance History & Workshop Repairs</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Truck repairs, scheduled servicing, tyre management, and official workshop job cards
          </p>
        </div>

        <button
          onClick={onOpenMaintenanceModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/20 cursor-pointer self-start sm:self-auto transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Log Maintenance Job</span>
        </button>
      </div>

      {/* Fleet Mechanical Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trucks.map((truck) => {
          const isJRB = truck.registration.includes('JRB');
          const isUnderMaint = truck.status === 'maintenance';

          return (
            <div
              key={truck.registration}
              className={`p-5 rounded-3xl border transition-all shadow-xl backdrop-blur-sm relative overflow-hidden ${
                isUnderMaint
                  ? isDark ? 'bg-rose-950/40 border-rose-600/60 shadow-rose-900/20' : 'bg-rose-50 border-rose-300 shadow-sm'
                  : isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black text-slate-950 shadow-md ${
                      isJRB ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  >
                    {truck.registration}
                  </span>
                  <div>
                    <h3 className={`text-sm font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{truck.make}</h3>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Driver: {truck.driver}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center space-x-1.5 ${
                      isUnderMaint
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isUnderMaint ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                    <span>{isUnderMaint ? 'In Workshop' : 'Road Ready'}</span>
                  </span>
                  <button
                    onClick={() =>
                      updateTruckStatus(truck.registration, isUnderMaint ? 'active' : 'maintenance')
                    }
                    className="text-[11px] font-bold text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 cursor-pointer transition-colors"
                  >
                    {isUnderMaint ? 'Set Road Ready' : 'Set In Workshop'}
                  </button>
                </div>
              </div>

              {/* Predictive Maintenance & Odometer Service Countdown */}
              {(() => {
                const odo = truck.odometerKm || (isJRB ? 488420 : 342180);
                const nextSvc = truck.nextServiceKm || (isJRB ? 500000 : 350000);
                const remaining = Math.max(0, nextSvc - odo);
                const progressPct = Math.min(100, Math.round(((50000 - remaining) / 50000) * 100));

                return (
                  <div className={`mt-4 p-3 rounded-2xl border text-xs ${
                    isDark ? 'bg-[#081026] border-[#18274d]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Predictive B-Service Countdown:</span>
                      </span>
                      <span className="font-mono tabular-nums font-black text-blue-500">
                        {remaining.toLocaleString()} km remaining
                      </span>
                    </div>

                    <div className="w-full bg-slate-700/30 rounded-full h-2 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          remaining < 3000 ? 'bg-rose-500' : remaining < 8000 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(5, progressPct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Odometer: <strong className="font-mono text-slate-200">{odo.toLocaleString()} km</strong></span>
                      <span>Next Interval: <strong className="font-mono text-slate-200">{nextSvc.toLocaleString()} km</strong></span>
                    </div>
                  </div>
                );
              })()}

              {/* 6x4 Axle Tyre Condition & Pressure Inspection Toggle */}
              <div className="mt-3.5 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tyre Telemetry (6x4 Axle):</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">10 Wheels Monitored</span>
                </div>
                <button
                  onClick={() =>
                    setExpandedTyresTruck(
                      expandedTyresTruck === truck.registration ? null : truck.registration
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold text-[11px] border border-blue-500/30 transition-colors cursor-pointer"
                >
                  {expandedTyresTruck === truck.registration ? 'Hide Axle Diagram' : 'Inspect 6x4 Axle Diagram'}
                </button>
              </div>

              {/* Expanded 6x4 Axle Diagram */}
              {expandedTyresTruck === truck.registration && (
                <div className={`mt-3 p-3.5 rounded-2xl border animate-in fade-in space-y-3 ${
                  isDark ? 'bg-[#080e22] border-[#1d2d54]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="text-[11px] font-bold flex items-center justify-between text-slate-300">
                    <span>Axle Tyre Position & Pressure Matrix</span>
                    <span className="text-slate-400 text-[10px]">Tread depth (mm) / Pressure (PSI)</span>
                  </div>

                  {/* Visual Axle Grid */}
                  <div className="space-y-2">
                    {/* Steer Axle (2 wheels) */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                        Front Steer Axle (105-120 PSI)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {(truck.tyres || []).slice(0, 2).map((tyre, idx) => (
                          <div
                            key={tyre.position}
                            onClick={() => {
                              setEditingTyreIdx({ truckReg: truck.registration, idx });
                              setTyreDepthInput(String(tyre.treadDepthMm));
                              setTyrePsiInput(String(tyre.pressurePsi));
                            }}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                              tyre.status === 'good'
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            <div>
                              <span className="font-bold block truncate">{tyre.position}</span>
                              <span className="text-[9px] text-slate-400">{tyre.pressurePsi} PSI</span>
                            </div>
                            <span className="font-mono tabular-nums font-black text-xs">
                              {tyre.treadDepthMm} mm
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Drive Axle 1 (4 wheels) */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                        Drive Axle 1 - Dual Assembly
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                        {(truck.tyres || []).slice(2, 6).map((tyre, idx) => (
                          <div
                            key={tyre.position}
                            onClick={() => {
                              setEditingTyreIdx({ truckReg: truck.registration, idx: idx + 2 });
                              setTyreDepthInput(String(tyre.treadDepthMm));
                              setTyrePsiInput(String(tyre.pressurePsi));
                            }}
                            className={`p-1.5 rounded-lg border text-center cursor-pointer transition-all hover:scale-[1.01] ${
                              tyre.status === 'good'
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            <span className="font-bold block text-[9px] truncate">{tyre.position.split('(')[0]}</span>
                            <span className="font-mono tabular-nums font-black text-xs block my-0.5">
                              {tyre.treadDepthMm} mm
                            </span>
                            <span className="text-[9px] text-slate-400 block">{tyre.pressurePsi} PSI</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Drive Axle 2 (4 wheels) */}
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                        Drive Axle 2 - Dual Assembly
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                        {(truck.tyres || []).slice(6, 10).map((tyre, idx) => (
                          <div
                            key={tyre.position}
                            onClick={() => {
                              setEditingTyreIdx({ truckReg: truck.registration, idx: idx + 6 });
                              setTyreDepthInput(String(tyre.treadDepthMm));
                              setTyrePsiInput(String(tyre.pressurePsi));
                            }}
                            className="p-1.5 rounded-lg border text-center cursor-pointer transition-all hover:scale-[1.01] bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                          >
                            <span className="font-bold block text-[9px] truncate">{tyre.position.split('(')[0]}</span>
                            <span className="font-mono tabular-nums font-black text-xs block my-0.5">
                              {tyre.treadDepthMm} mm
                            </span>
                            <span className="text-[9px] text-slate-400 block">{tyre.pressurePsi} PSI</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Inline Tyre measurement update drawer */}
                  {editingTyreIdx && editingTyreIdx.truckReg === truck.registration && (
                    <div className="p-3 rounded-xl border border-blue-500/50 bg-[#0d1633] space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>Log Depot Measurement for Tyre #{editingTyreIdx.idx + 1}</span>
                        <button onClick={() => setEditingTyreIdx(null)} className="text-slate-400 hover:text-white cursor-pointer">&times;</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Tread Depth (mm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={tyreDepthInput}
                            onChange={(e) => setTyreDepthInput(e.target.value)}
                            className="w-full rounded p-1.5 bg-slate-900 border border-slate-700 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Pressure (PSI)</label>
                          <input
                            type="number"
                            value={tyrePsiInput}
                            onChange={(e) => setTyrePsiInput(e.target.value)}
                            className="w-full rounded p-1.5 bg-slate-900 border border-slate-700 text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          onClick={async () => {
                            if (!truck.tyres) return;
                            const newTyres = [...truck.tyres];
                            const depth = parseFloat(tyreDepthInput) || 10;
                            const psi = parseFloat(tyrePsiInput) || 110;
                            newTyres[editingTyreIdx.idx] = {
                              ...newTyres[editingTyreIdx.idx],
                              treadDepthMm: depth,
                              pressurePsi: psi,
                              status: depth < 6 ? 'replace' : depth < 9 ? 'warning' : 'good'
                            };
                            await updateTruckTyres(truck.registration, newTyres);
                            setEditingTyreIdx(null);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                        >
                          Save Tyre Measurement
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Spend (ZAR)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalCostZAR, 'ZAR')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            ~{formatCurrency(totalCostUSD, 'USD')} equivalent
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Job Cards Logged</span>
            <FileText className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {filteredRecords.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Repairs across filtered range
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Receipts Stored</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
            {filteredRecords.filter((r) => Boolean(r.receiptUrl)).length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Stored in Firebase Storage
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tyres & Overhauls</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
            {filteredRecords.filter((r) => r.description.toLowerCase().includes('tyre') || r.description.toLowerCase().includes('brake')).length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Brake & tyre safety items
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Filterable by Truck & Date Range */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            <Filter className="w-4 h-4" />
            <span>Filter Maintenance History</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredRecords.length}</strong> records
            </span>
            {(truckFilter !== 'ALL' || startDate || endDate || searchQuery) && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer ml-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Truck Selection Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Truck Filter
            </label>
            {isAdmin ? (
              <select
                value={truckFilter}
                onChange={(e) => {
                  setTruckFilter(e.target.value);
                  setSelectedTruckFilter(e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="ALL">All Fleet (JRB 216MP & KBR 813MP)</option>
                <option value="JRB 216MP">JRB 216MP — Scania R500 (Tichaona)</option>
                <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Anthony)</option>
              </select>
            ) : (
              <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-rose-300 font-bold">
                {assignedTruck} (Assigned Truck)
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Search query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Search Description
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tyre, brakes, oil, workshop..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Date presets pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Presets:</span>
          <button
            onClick={() => handleSetDatePreset('all')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            All Time
          </button>
          <button
            onClick={() => handleSetDatePreset('today')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => handleSetDatePreset('7days')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handleSetDatePreset('30days')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handleSetDatePreset('this_month')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-colors"
          >
            This Month
          </button>
        </div>
      </div>

      {/* Maintenance Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
          <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No maintenance records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            No repair job cards or tyre services match your selected truck or date range filter.
          </p>
          <button
            onClick={onOpenMaintenanceModal}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-600/20"
          >
            Log Maintenance Job
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {filteredRecords.map((record) => {
              const truckReg = extractTruckRegistration(record.truckId);
              const isJRB = truckReg.includes('JRB');
              const costZAR = convertToZAR(record.cost, record.currency, exchangeRates);

              return (
                <div
                  key={record.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wider text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-inner">
                      {truckReg}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(record.timestamp)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {record.description}
                    </h4>
                    {record.tripId && (
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Linked Trip: <strong className="text-slate-300">{String(record.tripId)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                    <div>
                      <div className="text-base font-black text-white font-mono">
                        {formatCurrency(record.cost, record.currency)}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold font-mono">
                        ~{formatCurrency(costZAR, 'ZAR')}
                      </div>
                    </div>

                    {/* Download Receipt Button */}
                    {record.receiptUrl ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setViewerUrl(record.receiptUrl);
                            setViewerTitle(`Workshop Receipt - ${truckReg} - ${record.id.slice(-6)}`);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                          title="Preview Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(record)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic bg-slate-800/60 px-2.5 py-1 rounded-lg">
                        No Receipt
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Truck</th>
                    <th className="px-4 py-3.5">Work Done / Description</th>
                    <th className="px-4 py-3.5">Cost</th>
                    <th className="px-4 py-3.5">ZAR Equiv.</th>
                    <th className="px-4 py-3.5">Linked Trip</th>
                    <th className="px-4 py-3.5">Date & Time</th>
                    <th className="px-4 py-3.5 text-right">Receipt Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredRecords.map((record) => {
                    const truckReg = extractTruckRegistration(record.truckId);
                    const isJRB = truckReg.includes('JRB');
                    const costZAR = convertToZAR(record.cost, record.currency, exchangeRates);

                    return (
                      <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-black text-[11px] ${
                              isJRB ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                            }`}
                          >
                            {truckReg}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-sm">
                          <div className="font-bold text-white text-xs">{record.description}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-sm text-white">
                          {formatCurrency(record.cost, record.currency)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-xs text-emerald-400">
                          {formatCurrency(costZAR, 'ZAR')}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                          {record.tripId && record.tripId !== 'workshop_general' ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                              {String(record.tripId)}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Workshop Depot</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                          {formatDateTime(record.timestamp)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          {record.receiptUrl ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setViewerUrl(record.receiptUrl);
                                  setViewerTitle(`Workshop Receipt - ${truckReg} - ${record.id.slice(-6)}`);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer transition-colors"
                                title="View inline"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDownloadReceipt(record)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer transition-colors shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Receipt</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px] px-2 py-1 bg-slate-800/40 rounded-lg">
                              No Receipt
                            </span>
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

      {/* Inline Receipt Preview Modal */}
      {viewerUrl && (
        <ReceiptViewerModal
          isOpen={Boolean(viewerUrl)}
          onClose={() => setViewerUrl(null)}
          url={viewerUrl}
          title={viewerTitle}
        />
      )}
    </div>
  );
};
