import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { Trip, FuelLog, Expense, Maintenance } from '../types';
import {
  convertToZAR,
  convertToUSD,
  formatCurrency,
  formatDateTime,
  formatDateOnly,
  extractTruckRegistration,
  matchesTrip
} from '../utils/helpers';
import {
  Route,
  Fuel,
  Receipt,
  Wrench,
  DollarSign,
  TrendingUp,
  Download,
  Eye,
  Calendar,
  Truck,
  CheckCircle2,
  PieChart,
  ArrowRight,
  Layers,
  ChevronDown
} from 'lucide-react';
import { ReceiptViewerModal } from './ReceiptViewerModal';

interface TripCostSummaryProps {
  selectedTripId?: string;
  onSelectTripId?: (id: string) => void;
  onClose?: () => void;
}

export const TripCostSummaryView: React.FC<TripCostSummaryProps> = ({
  selectedTripId: initialTripId,
  onSelectTripId,
  onClose
}) => {
  const { trips, fuelLogs, expenses, maintenance, exchangeRates } = useFleet();

  // Active selected trip
  const [activeTripId, setActiveTripId] = useState<string>(
    initialTripId || (trips.length > 0 ? trips[0].id : '')
  );

  // Tab inside summary: 'all' | 'fuel' | 'expenses' | 'maintenance'
  const [activeCostTab, setActiveCostTab] = useState<'all' | 'fuel' | 'expenses' | 'maintenance'>('all');

  // Receipt viewer modal
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('Receipt Preview');

  // Get selected trip object
  const selectedTrip = useMemo(() => {
    return trips.find((t) => t.id === activeTripId) || trips[0] || null;
  }, [trips, activeTripId]);

  // Handle changing trip
  const handleTripChange = (id: string) => {
    setActiveTripId(id);
    if (onSelectTripId) {
      onSelectTripId(id);
    }
  };

  // 1. Linked Fuel Logs for this trip
  const tripFuelLogs = useMemo(() => {
    if (!selectedTrip) return [];
    return fuelLogs.filter((log) => matchesTrip(log.tripId, selectedTrip.id));
  }, [fuelLogs, selectedTrip]);

  // 2. Linked Route Expenses for this trip
  const tripExpenses = useMemo(() => {
    if (!selectedTrip) return [];
    return expenses.filter((exp) => matchesTrip(exp.tripId, selectedTrip.id));
  }, [expenses, selectedTrip]);

  // 3. Linked Maintenance Records for this trip
  const tripMaintenance = useMemo(() => {
    if (!selectedTrip) return [];
    return maintenance.filter((m) => matchesTrip(m.tripId, selectedTrip.id));
  }, [maintenance, selectedTrip]);

  // Calculations in ZAR
  const fuelTotalZAR = useMemo(() => {
    return tripFuelLogs.reduce(
      (sum, item) => sum + convertToZAR(item.cost, item.currency, exchangeRates),
      0
    );
  }, [tripFuelLogs, exchangeRates]);

  const fuelTotalLitres = useMemo(() => {
    return tripFuelLogs.reduce((sum, item) => sum + Number(item.litres || 0), 0);
  }, [tripFuelLogs]);

  const expensesTotalZAR = useMemo(() => {
    return tripExpenses.reduce(
      (sum, item) => sum + convertToZAR(item.amount, item.currency, exchangeRates),
      0
    );
  }, [tripExpenses, exchangeRates]);

  const maintenanceTotalZAR = useMemo(() => {
    return tripMaintenance.reduce(
      (sum, item) => sum + convertToZAR(item.cost, item.currency, exchangeRates),
      0
    );
  }, [tripMaintenance, exchangeRates]);

  // Combined Grand Total in ZAR
  const grandTotalZAR = fuelTotalZAR + expensesTotalZAR + maintenanceTotalZAR;

  // Combined Grand Total in USD
  const grandTotalUSD = convertToUSD(grandTotalZAR, 'ZAR', exchangeRates);

  // Percentage distributions
  const fuelPct = grandTotalZAR > 0 ? (fuelTotalZAR / grandTotalZAR) * 100 : 0;
  const expPct = grandTotalZAR > 0 ? (expensesTotalZAR / grandTotalZAR) * 100 : 0;
  const maintPct = grandTotalZAR > 0 ? (maintenanceTotalZAR / grandTotalZAR) * 100 : 0;

  const truckReg = selectedTrip ? extractTruckRegistration(selectedTrip.truckId) : '';
  const isJRB = truckReg.includes('JRB');

  const handleDownload = (url: string, prefix: string, id: string) => {
    if (!url) return;
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${prefix}_${truckReg}_${id.slice(-6)}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (!selectedTrip) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center">
        <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No trip selected</h3>
        <p className="text-xs text-slate-400 mt-1">Please select an active or completed trip to view its cost summary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Trip Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <PieChart className="w-4 h-4" />
              <span>Trip Cost Analysis & Financial Audit</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <span>Trip Cost Summary</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                ZAR Native
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consolidated per-trip audit combining fuel diesel, tollgate expenses, and maintenance in South African Rand (ZAR)
            </p>
          </div>

          {/* Trip Selector Dropdown */}
          <div className="w-full md:w-80">
            <label htmlFor="trip-summary-select" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Trip for Cost Analysis *
            </label>
            <div className="relative">
              <select
                id="trip-summary-select"
                value={activeTripId}
                onChange={(e) => handleTripChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-500 cursor-pointer shadow-lg"
              >
                {trips.map((trip) => {
                  const reg = extractTruckRegistration(trip.truckId);
                  return (
                    <option key={trip.id} value={trip.id}>
                      {trip.origin} ➔ {trip.destination} ({reg})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Trip Overview Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Truck</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-0.5 rounded-md font-black text-xs text-slate-950 ${isJRB ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                {truckReg}
              </span>
              <span className="text-white font-semibold">Driver: {selectedTrip.driver}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Freight Route</span>
            <div className="flex items-center space-x-1.5 mt-1 font-bold text-white">
              <span>{selectedTrip.origin}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{selectedTrip.destination}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dispatch Window</span>
            <div className="mt-1 font-semibold text-slate-300">
              {formatDateOnly(selectedTrip.startDate)} – {formatDateOnly(selectedTrip.endDate)}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trip Status</span>
            <div className="mt-1">
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{selectedTrip.status.replace('_', ' ')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grand Total Hero Banner in ZAR */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Consolidated Trip Total Cost</span>
            </div>
            <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
              {formatCurrency(grandTotalZAR, 'ZAR')}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center space-x-2">
              <span>Equivalent in USD: <strong className="text-emerald-300 font-mono font-bold">{formatCurrency(grandTotalUSD, 'USD')}</strong></span>
              <span>•</span>
              <span>Rates: 1 USD = R{(1 / (exchangeRates?.ZAR_USD || 0.055)).toFixed(2)} ZAR</span>
            </div>
          </div>

          {/* Three Cost Pillars Summary */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto">
            {/* Fuel Pillar */}
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-3.5 text-center min-w-[110px]">
              <div className="flex items-center justify-center space-x-1 text-amber-400 mb-1">
                <Fuel className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Fuel Cost</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
                {formatCurrency(fuelTotalZAR, 'ZAR')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {fuelTotalLitres.toFixed(0)} L taken
              </div>
            </div>

            {/* Expenses Pillar */}
            <div className="bg-slate-950/70 border border-blue-500/30 rounded-2xl p-3.5 text-center min-w-[110px]">
              <div className="flex items-center justify-center space-x-1 text-blue-400 mb-1">
                <Receipt className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Expenses</span>
              </div>
              <div className="text-base sm:text-lg font-black text-blue-400 font-mono">
                {formatCurrency(expensesTotalZAR, 'ZAR')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {tripExpenses.length} route items
              </div>
            </div>

            {/* Maintenance Pillar */}
            <div className="bg-slate-950/70 border border-rose-500/30 rounded-2xl p-3.5 text-center min-w-[110px]">
              <div className="flex items-center justify-center space-x-1 text-rose-400 mb-1">
                <Wrench className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Repairs</span>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-400 font-mono">
                {formatCurrency(maintenanceTotalZAR, 'ZAR')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {tripMaintenance.length} job cards
              </div>
            </div>
          </div>
        </div>

        {/* Visual Cost Distribution Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Expenditure Distribution</span>
            <div className="flex items-center space-x-4 text-[11px] font-bold">
              <span className="text-amber-400">Fuel: {fuelPct.toFixed(1)}%</span>
              <span className="text-blue-400">Expenses: {expPct.toFixed(1)}%</span>
              <span className="text-rose-400">Repairs: {maintPct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${fuelPct}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Fuel: ${fuelPct.toFixed(1)}%`}
            />
            <div
              style={{ width: `${expPct}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`Route Expenses: ${expPct.toFixed(1)}%`}
            />
            <div
              style={{ width: `${maintPct}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Maintenance: ${maintPct.toFixed(1)}%`}
            />
          </div>
        </div>
      </div>

      {/* Tab Filter for Itemized Line Items */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Itemized Trip Cost Records</span>
          </div>

          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveCostTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeCostTab === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Categories ({tripFuelLogs.length + tripExpenses.length + tripMaintenance.length})
            </button>
            <button
              onClick={() => setActiveCostTab('fuel')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeCostTab === 'fuel' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fuel ({tripFuelLogs.length})
            </button>
            <button
              onClick={() => setActiveCostTab('expenses')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeCostTab === 'expenses' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expenses ({tripExpenses.length})
            </button>
            <button
              onClick={() => setActiveCostTab('maintenance')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeCostTab === 'maintenance' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Maintenance ({tripMaintenance.length})
            </button>
          </div>
        </div>

        {/* Detailed Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description / Vendor</th>
                <th className="px-4 py-3">Original Cost</th>
                <th className="px-4 py-3">Cost in ZAR</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {/* 1. Fuel Records */}
              {(activeCostTab === 'all' || activeCostTab === 'fuel') &&
                tripFuelLogs.map((log) => {
                  const costZAR = convertToZAR(log.cost, log.currency, exchangeRates);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Fuel className="w-3 h-3" />
                          <span>Fuel ({log.litres} L)</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{log.stationName}</div>
                        <div className="text-[11px] text-slate-400">{log.location}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-300">
                        {formatCurrency(log.cost, log.currency)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(costZAR, 'ZAR')}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {log.receiptUrl ? (
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setViewerUrl(log.receiptUrl);
                                setViewerTitle(`Fuel Slip - ${log.stationName}`);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownload(log.receiptUrl, 'Fuel_Slip', log.id)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold"
                            >
                              Download Receipt
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No receipt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {/* 2. Expense Records */}
              {(activeCostTab === 'all' || activeCostTab === 'expenses') &&
                tripExpenses.map((exp) => {
                  const costZAR = convertToZAR(exp.amount, exp.currency, exchangeRates);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          <Receipt className="w-3 h-3" />
                          <span className="capitalize">{exp.category}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{exp.description}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-300">
                        {formatCurrency(exp.amount, exp.currency)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(costZAR, 'ZAR')}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTime(exp.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {exp.receiptUrl ? (
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setViewerUrl(exp.receiptUrl);
                                setViewerTitle(`Expense Receipt - ${exp.category}`);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownload(exp.receiptUrl, 'Expense', exp.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-bold"
                            >
                              Download Receipt
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No receipt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {/* 3. Maintenance Records */}
              {(activeCostTab === 'all' || activeCostTab === 'maintenance') &&
                tripMaintenance.map((maint) => {
                  const costZAR = convertToZAR(maint.cost, maint.currency, exchangeRates);
                  return (
                    <tr key={maint.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <Wrench className="w-3 h-3" />
                          <span>Repairs & Workshop</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{maint.description}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-300">
                        {formatCurrency(maint.cost, maint.currency)}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {formatCurrency(costZAR, 'ZAR')}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTime(maint.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {maint.receiptUrl ? (
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setViewerUrl(maint.receiptUrl);
                                setViewerTitle(`Maintenance Job Card - ${maint.id.slice(-6)}`);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownload(maint.receiptUrl, 'Maintenance', maint.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold"
                            >
                              Download Receipt
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No receipt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

              {tripFuelLogs.length === 0 && tripExpenses.length === 0 && tripMaintenance.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No costs have been logged for this trip yet. Use the Fuel, Expenses, or Maintenance forms to record items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
