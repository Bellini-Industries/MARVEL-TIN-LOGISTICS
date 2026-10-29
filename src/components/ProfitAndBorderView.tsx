import React, { useState, useMemo, useEffect } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Trip, BorderCheckpoint, BorderClearanceStatus } from '../types';
import {
  convertToUSD,
  convertToZAR,
  formatCurrency,
  formatDateOnly,
  extractTruckRegistration,
  matchesTrip
} from '../utils/helpers';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Edit3,
  Save,
  Truck,
  ArrowRight,
  ShieldCheck,
  FileText,
  MapPin,
  ExternalLink,
  ChevronRight,
  Layers,
  Fuel,
  Receipt,
  Wrench
} from 'lucide-react';

interface ProfitAndBorderViewProps {
  onOpenCustomsDossier?: (trip: Trip) => void;
}

export const ProfitAndBorderView: React.FC<ProfitAndBorderViewProps> = ({
  onOpenCustomsDossier
}) => {
  const {
    trips,
    fuelLogs,
    expenses,
    maintenance,
    exchangeRates,
    updateTripCommercials,
    updateTripBorderStatus
  } = useFleet();
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'profitability' | 'borders'>('profitability');
  const [selectedTripId, setSelectedTripId] = useState<string>(
    trips.length > 0 ? trips[0].id : ''
  );

  // Commercials inline editor state
  const [isEditingCommercials, setIsEditingCommercials] = useState<boolean>(false);
  const [editRevenue, setEditRevenue] = useState<string>('');
  const [editKm, setEditKm] = useState<string>('');
  const [editCargo, setEditCargo] = useState<string>('');

  // Selected trip memo
  const currentTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || trips[0] || null;
  }, [trips, selectedTripId]);

  // Sync edit fields when trip changes
  useEffect(() => {
    if (currentTrip) {
      setEditRevenue(String(currentTrip.revenueUSD || 4850));
      setEditKm(String(currentTrip.totalKm || 1680));
      setEditCargo(currentTrip.cargo || 'Tin Ore Concentrate (32 Metric Tons)');
    }
  }, [currentTrip]);

  // Associated costs for the active trip
  const tripFuel = useMemo(() => {
    if (!currentTrip) return [];
    return fuelLogs.filter((l) => matchesTrip(l.tripId, currentTrip.id));
  }, [fuelLogs, currentTrip]);

  const tripExpenses = useMemo(() => {
    if (!currentTrip) return [];
    return expenses.filter((e) => matchesTrip(e.tripId, currentTrip.id));
  }, [expenses, currentTrip]);

  const tripMaintenance = useMemo(() => {
    if (!currentTrip) return [];
    return maintenance.filter((m) => matchesTrip(m.tripId, currentTrip.id));
  }, [maintenance, currentTrip]);

  // Sums in USD
  const totalFuelUSD = useMemo(() => {
    return tripFuel.reduce(
      (sum, item) => sum + convertToUSD(item.cost, item.currency, exchangeRates),
      0
    );
  }, [tripFuel, exchangeRates]);

  const totalExpensesUSD = useMemo(() => {
    return tripExpenses.reduce(
      (sum, item) => sum + convertToUSD(item.amount, item.currency, exchangeRates),
      0
    );
  }, [tripExpenses, exchangeRates]);

  const totalMaintenanceUSD = useMemo(() => {
    return tripMaintenance.reduce(
      (sum, item) => sum + convertToUSD(item.cost, item.currency, exchangeRates),
      0
    );
  }, [tripMaintenance, exchangeRates]);

  const totalDirectCostsUSD = totalFuelUSD + totalExpensesUSD + totalMaintenanceUSD;
  const tripRevenueUSD = currentTrip?.revenueUSD || 4850;
  const tripKm = currentTrip?.totalKm || 1680;

  const netProfitUSD = tripRevenueUSD - totalDirectCostsUSD;
  const marginPercent = tripRevenueUSD > 0 ? (netProfitUSD / tripRevenueUSD) * 100 : 0;
  const costPerKmUSD = tripKm > 0 ? totalDirectCostsUSD / tripKm : 0;
  const breakevenFreightRateUSD = totalDirectCostsUSD;

  // Convert to ZAR for cross-border ledger
  const tripRevenueZAR = convertToZAR(tripRevenueUSD, 'USD', exchangeRates);
  const netProfitZAR = convertToZAR(netProfitUSD, 'USD', exchangeRates);
  const totalDirectCostsZAR = convertToZAR(totalDirectCostsUSD, 'USD', exchangeRates);

  // Border dwell helper: computes hours & minutes since borderEntryTime
  const getDwellDetails = (entryTime: any) => {
    if (!entryTime) return { hours: 0, minutes: 0, totalHours: 0, isDemurrage: false, demurrageUSD: 0 };
    let d: Date;
    if (entryTime instanceof Date) d = entryTime;
    else if (entryTime.toDate && typeof entryTime.toDate === 'function') d = entryTime.toDate();
    else d = new Date(entryTime);

    const diffMs = Math.max(0, Date.now() - d.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalHours = totalMinutes / 60;

    // Demurrage starts after 18 hours dwell tolerance at $250/day ($10.42/hr)
    const isDemurrage = totalHours > 18;
    const excessHours = Math.max(0, totalHours - 18);
    const demurrageUSD = Number((excessHours * (250 / 24)).toFixed(2));

    return { hours, minutes, totalHours, isDemurrage, demurrageUSD };
  };

  const handleSaveCommercials = async () => {
    if (!currentTrip) return;
    const rev = parseFloat(editRevenue) || 0;
    const km = parseFloat(editKm) || 0;
    await updateTripCommercials(currentTrip.id, {
      revenueUSD: rev,
      totalKm: km,
      cargo: editCargo.trim() || undefined
    });
    setIsEditingCommercials(false);
  };

  const handleAdvanceBorderStatus = async (trip: Trip, newStatus: BorderClearanceStatus) => {
    await updateTripBorderStatus(trip.id, {
      borderStatus: newStatus,
      borderEntryTime: trip.borderEntryTime ? new Date(trip.borderEntryTime as any) : new Date()
    });
  };

  const handleSendWhatsAppAgentAlert = (trip: Trip, dwellHours: number) => {
    const truckReg = extractTruckRegistration(trip.truckId);
    const text = encodeURIComponent(
      `*MARVEL TIN LOGISTICS - BORDER EXPEDITE REQUEST*\n\n` +
      `*Truck:* ${truckReg} (${trip.driver})\n` +
      `*Border Post:* ${trip.borderCheckpoint || 'Beitbridge'}\n` +
      `*Dwell Time:* ${dwellHours.toFixed(1)} hours\n` +
      `*Manifest #:* ${trip.customsManifestNumber || 'ZIM-CD3-9041'}\n` +
      `*Cargo:* ${trip.cargo || 'Tin Ore Concentrate'}\n\n` +
      `Please expedite clearance and issue gate pass before demurrage penalties accumulate.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5 animate-view-enter">
      {/* Top Navigation & Mode Switcher */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-2xl p-4 transition-colors ${
        isDark ? 'bg-[#0d162d] border-[#1b2b4f] text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold">
            {activeTab === 'profitability' ? <DollarSign className="w-5 h-5 text-blue-500" /> : <Clock className="w-5 h-5 text-amber-500" />}
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">
              {activeTab === 'profitability' ? 'Trip Margin & Net Profitability Engine' : 'Cross-Border Delay & Customs Monitor'}
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeTab === 'profitability'
                ? 'Real-Time Revenue, Cost Per Km (CPK), and Net Operating Profit'
                : 'Live Gate Dwell-Time, Demurrage Risk & Customs Turnaround Tracking'}
            </p>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className={`flex items-center rounded-xl p-1 text-xs font-semibold border ${
          isDark ? 'bg-[#131f3d] border-[#213460]' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('profitability')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'profitability'
                ? 'bg-blue-600 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Trip Margins & P&L</span>
          </button>
          <button
            onClick={() => setActiveTab('borders')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'borders'
                ? 'bg-blue-600 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Border Turnaround</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TRIP MARGINS & P&L ENGINE */}
      {activeTab === 'profitability' && (
        <div className="space-y-5">
          {/* Active Trip Selector Bar */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-2xl p-4 transition-colors ${
            isDark ? 'bg-[#0f1936] border-[#1e2f57]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center space-x-2 text-xs">
              <span className={`font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Active Corridor Load:
              </span>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className={`font-mono text-xs font-bold rounded-lg px-3 py-1.5 border focus:outline-none focus:border-blue-500 ${
                  isDark ? 'bg-[#131e3b] border-[#203159] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {extractTruckRegistration(t.truckId)} · {t.origin.split(',')[0]} &rarr; {t.destination.split(',')[0]} ({t.cargo || 'Freight'})
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsEditingCommercials(!isEditingCommercials)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isEditingCommercials
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isDark ? 'bg-[#142145] text-slate-300 border-[#233869] hover:text-white' : 'bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingCommercials ? 'Cancel Editing' : 'Adjust Freight Rate & Km'}</span>
              </button>
            )}
          </div>

          {/* Inline Commercials Editor Drawer */}
          {isEditingCommercials && (
            <div className={`border rounded-2xl p-4 animate-modal-enter transition-colors ${
              isDark ? 'bg-[#111c3d] border-blue-500/40 text-white' : 'bg-blue-50/70 border-blue-200 text-slate-900'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <label className="block font-bold mb-1">Freight Manifest Revenue (USD)</label>
                  <input
                    type="number"
                    value={editRevenue}
                    onChange={(e) => setEditRevenue(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 border font-mono font-bold focus:outline-none focus:border-blue-500 ${
                      isDark ? 'bg-[#0b132b] border-[#1d2d57] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 4850"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Planned Route Distance (Km)</label>
                  <input
                    type="number"
                    value={editKm}
                    onChange={(e) => setEditKm(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 border font-mono font-bold focus:outline-none focus:border-blue-500 ${
                      isDark ? 'bg-[#0b132b] border-[#1d2d57] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 1680"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Cargo / Manifest Description</label>
                  <input
                    type="text"
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 border font-medium focus:outline-none focus:border-blue-500 ${
                      isDark ? 'bg-[#0b132b] border-[#1d2d57] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Tin Ore Concentrate (32 Metric Tons)"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditingCommercials(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCommercials}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Commercials</span>
                </button>
              </div>
            </div>
          )}

          {/* 4 Primary Margin Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gross Revenue */}
            <div className={`rounded-2xl p-5 border shadow-lg ${
              isDark ? 'bg-[#0e172e] border-[#1C2A4D] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-bold uppercase tracking-wider">Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-blue-500">
                {formatCurrency(tripRevenueUSD, 'USD')}
              </div>
              <div className={`text-xs mt-1.5 font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ~{formatCurrency(tripRevenueZAR, 'ZAR')} manifest rate
              </div>
            </div>

            {/* 2. Direct Route Costs */}
            <div className={`rounded-2xl p-5 border shadow-lg ${
              isDark ? 'bg-[#0e172e] border-[#1C2A4D] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-bold uppercase tracking-wider">Direct Route Costs</span>
                <Fuel className="w-4 h-4 text-amber-500" />
              </div>
              <div className={`text-2xl font-black font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(totalDirectCostsUSD, 'USD')}
              </div>
              <div className={`text-xs mt-1.5 font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ~{formatCurrency(totalDirectCostsZAR, 'ZAR')} diesel & tolls
              </div>
            </div>

            {/* 3. Net Operating Profit */}
            <div className={`rounded-2xl p-5 border shadow-lg ${
              isDark ? 'bg-[#0e172e] border-[#1C2A4D] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-bold uppercase tracking-wider">Net Trip Profit</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className={`text-2xl font-black font-mono tabular-nums ${
                netProfitUSD >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {formatCurrency(netProfitUSD, 'USD')}
              </div>
              <div className={`text-xs mt-1.5 font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ~{formatCurrency(netProfitZAR, 'ZAR')} net contribution
              </div>
            </div>

            {/* 4. Margin & Cost Per KM */}
            <div className={`rounded-2xl p-5 border shadow-lg ${
              isDark ? 'bg-[#0e172e] border-[#1C2A4D] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-bold uppercase tracking-wider">Gross Operating Margin</span>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  marginPercent >= 30 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {marginPercent.toFixed(1)}%
                </span>
              </div>
              <div className={`text-2xl font-black font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ${costPerKmUSD.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ km</span>
              </div>
              <div className={`text-xs mt-1.5 font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Across {tripKm.toLocaleString()} corridor km
              </div>
            </div>
          </div>

          {/* Route Cost Waterfall & Margin Decomposition */}
          <div className={`rounded-2xl p-6 border shadow-lg space-y-4 ${
            isDark ? 'bg-[#0e172e] border-[#1C2A4D] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-700/50">
              <div>
                <h3 className="font-bold text-sm tracking-tight">Load P&L Waterfall Breakdown</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Revenue absorption across diesel fuel, border transit, tolls, and maintenance
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className={`font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Breakeven Rate: <strong className="text-blue-500">{formatCurrency(breakevenFreightRateUSD, 'USD')}</strong>
                </span>
              </div>
            </div>

            {/* Waterfall Items List */}
            <div className="space-y-3 text-xs">
              {/* Gross Revenue */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="font-bold">Gross Manifest Freight Revenue</span>
                  <span className="text-slate-400">({currentTrip?.cargo || '32 MT Tin Concentrate'})</span>
                </div>
                <span className="font-mono tabular-nums font-bold text-blue-500 text-sm">
                  +{formatCurrency(tripRevenueUSD, 'USD')}
                </span>
              </div>

              {/* Diesel Fuel */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-medium">(-) Corridor Diesel Fuel ({tripFuel.length} refuels)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                    ({tripRevenueUSD > 0 ? ((totalFuelUSD / tripRevenueUSD) * 100).toFixed(1) : 0}%)
                  </span>
                  <span className="font-mono tabular-nums font-bold text-amber-500">
                    -{formatCurrency(totalFuelUSD, 'USD')}
                  </span>
                </div>
              </div>

              {/* Tollgates & Route Expenses */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span className="font-medium">(-) Border Tolls, Customs Seals & Permits ({tripExpenses.length} entries)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                    ({tripRevenueUSD > 0 ? ((totalExpensesUSD / tripRevenueUSD) * 100).toFixed(1) : 0}%)
                  </span>
                  <span className="font-mono tabular-nums font-bold text-sky-500">
                    -{formatCurrency(totalExpensesUSD, 'USD')}
                  </span>
                </div>
              </div>

              {/* Maintenance */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span className="font-medium">(-) Route Repairs & Tyre Maintenance ({tripMaintenance.length} records)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                    ({tripRevenueUSD > 0 ? ((totalMaintenanceUSD / tripRevenueUSD) * 100).toFixed(1) : 0}%)
                  </span>
                  <span className="font-mono tabular-nums font-bold text-purple-500">
                    -{formatCurrency(totalMaintenanceUSD, 'USD')}
                  </span>
                </div>
              </div>

              {/* Net Retained Operating Profit */}
              <div className={`flex items-center justify-between pt-2.5 text-sm font-bold border-t ${
                isDark ? 'border-slate-700' : 'border-slate-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Net Retained Operating Profit</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono tabular-nums text-emerald-400 text-xs">
                    {marginPercent.toFixed(1)}% operating margin
                  </span>
                  <span className={`font-mono tabular-nums font-black text-base ${
                    netProfitUSD >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {formatCurrency(netProfitUSD, 'USD')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BORDER DELAYS & CUSTOMS TURNAROUND MONITOR */}
      {activeTab === 'borders' && (
        <div className="space-y-5">
          {/* Active Border Checkpoints Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {trips.map((trip) => {
              const truckReg = extractTruckRegistration(trip.truckId);
              const checkpoint = trip.borderCheckpoint || (String(trip.destination).includes('Lusaka') ? 'Chirundu' : 'Beitbridge');
              const status: BorderClearanceStatus = trip.borderStatus || (checkpoint === 'Beitbridge' ? 'cd3_inspection' : 'gate_queuing');
              const dwell = getDwellDetails(trip.borderEntryTime);

              return (
                <div
                  key={trip.id}
                  className={`rounded-2xl p-6 border shadow-xl relative overflow-hidden transition-colors ${
                    dwell.isDemurrage
                      ? 'border-rose-500/50 bg-[#161226]'
                      : isDark ? 'bg-[#0e172e] border-[#1C2A4D]' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Card Header: Border Post & Live Dwell Timer */}
                  <div className="flex items-start justify-between border-b pb-3.5 border-slate-700/50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {checkpoint} Border Post
                        </h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          dwell.isDemurrage ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {dwell.isDemurrage ? 'DEMURRAGE RISK' : 'IN CLEARANCE'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {truckReg} ({trip.driver}) · {trip.origin.split(',')[0]} &rarr; {trip.destination.split(',')[0]}
                      </p>
                    </div>

                    {/* Dwell Timer */}
                    <div className="text-right">
                      <span className={`text-[10px] uppercase font-bold block tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        GATE DWELL TIME
                      </span>
                      <span className={`text-xl font-black font-mono tabular-nums block ${
                        dwell.isDemurrage ? 'text-rose-500' : 'text-amber-400'
                      }`}>
                        {dwell.hours}h {dwell.minutes}m
                      </span>
                    </div>
                  </div>

                  {/* Demurrage Cost Loss Counter if > 18h */}
                  {dwell.isDemurrage && (
                    <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Standing Delay Exceeds 18h Tolerance. Daily Demurrage: $250.00</span>
                      </div>
                      <span className="font-mono font-bold text-rose-400 tabular-nums">
                        +${dwell.demurrageUSD} loss
                      </span>
                    </div>
                  )}

                  {/* Clearance Stage Workflow Progression */}
                  <div className="mt-4 space-y-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Clearance Stage Progression
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-[11px] font-semibold text-center">
                      <button
                        onClick={() => handleAdvanceBorderStatus(trip, 'pre_clearance')}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          status === 'pre_clearance'
                            ? 'bg-blue-600 text-white border-blue-500 font-bold'
                            : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        1. Pre-Clear
                      </button>
                      <button
                        onClick={() => handleAdvanceBorderStatus(trip, 'gate_queuing')}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          status === 'gate_queuing'
                            ? 'bg-amber-600 text-white border-amber-500 font-bold'
                            : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        2. Gate Queue
                      </button>
                      <button
                        onClick={() => handleAdvanceBorderStatus(trip, 'cd3_inspection')}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          status === 'cd3_inspection'
                            ? 'bg-purple-600 text-white border-purple-500 font-bold'
                            : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        3. CD3 Inspect
                      </button>
                      <button
                        onClick={() => handleAdvanceBorderStatus(trip, 'cleared')}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          status === 'cleared'
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                            : isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        4. Cleared Pass
                      </button>
                    </div>
                  </div>

                  {/* Manifest & Document Reference */}
                  <div className={`mt-4 p-3 rounded-xl border text-xs grid grid-cols-2 gap-2 ${
                    isDark ? 'bg-[#070e24] border-[#18274d]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Customs Manifest Ref
                      </span>
                      <span className="font-mono font-bold text-sky-400">
                        {trip.customsManifestNumber || 'ZIM-CD3-9041-ZW'}
                      </span>
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        GIT Insurance Policy
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {trip.gitPolicyNumber || 'GIT-SADC-99201'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Customs Pack & WhatsApp Agent Expedite */}
                  <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-slate-700/40">
                    <button
                      onClick={() => onOpenCustomsDossier && onOpenCustomsDossier(trip)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Customs Dossier</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsAppAgentAlert(trip, dwell.totalHours)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Expedite via WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SADC Regional Border Corridor Benchmarks */}
          <div className={`rounded-2xl p-5 border text-xs space-y-3 ${
            isDark ? 'bg-[#0e172e] border-[#1C2A4D] text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-sm tracking-tight text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>SADC Commercial Transit Corridors Benchmark</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#091024] border-[#18274d]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold block">Beitbridge (ZW - SA)</span>
                <span className="text-slate-400 block mt-0.5">Average Turnaround: 5.8 hours</span>
                <span className="text-[11px] text-emerald-400 font-semibold block mt-1">Normal Transit Flow</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#091024] border-[#18274d]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold block">Chirundu (ZW - ZAM)</span>
                <span className="text-slate-400 block mt-0.5">Average Turnaround: 7.2 hours</span>
                <span className="text-[11px] text-amber-400 font-semibold block mt-1">CD3 Customs Clearance Active</span>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#091024] border-[#18274d]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold block">Plumtree (ZW - BWP)</span>
                <span className="text-slate-400 block mt-0.5">Average Turnaround: 3.4 hours</span>
                <span className="text-[11px] text-emerald-400 font-semibold block mt-1">Expedited Green Channel</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
