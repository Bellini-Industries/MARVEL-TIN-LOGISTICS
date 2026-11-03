import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFleet } from '../context/FleetContext';
import { useTheme } from '../context/ThemeContext';
import { Trip } from '../types';
import { formatCurrency, convertToUSD } from '../utils/helpers';
import {
  Truck,
  Fuel,
  Receipt,
  Wallet,
  Clock,
  ShieldCheck,
  FileCheck2,
  Phone,
  MessageCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Navigation,
  MapPin,
  Coffee,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Scale,
  ArrowRight,
  Radio,
  Smartphone,
  Signal,
  Compass
} from 'lucide-react';
import { DriverTripWorkflowModal } from './DriverTripWorkflowModal';
import { usePhoneGpsTracker } from '../hooks/usePhoneGpsTracker';
import { DriverStationaryAlertToast } from './DriverStationaryAlertToast';
import { NearbyRestStopsModal } from './NearbyRestStopsModal';

interface DriverCabConsoleProps {
  onOpenFuelModal: (truckId?: string) => void;
  onOpenExpenseModal: (truckId?: string) => void;
  onOpenPettyCashModal: (truckId?: string) => void;
  onOpenCustomsDossier: (trip: Trip) => void;
  onOpenTripDetails?: (trip: Trip) => void;
}

export const DriverCabConsole: React.FC<DriverCabConsoleProps> = ({
  onOpenFuelModal,
  onOpenExpenseModal,
  onOpenPettyCashModal,
  onOpenCustomsDossier
}) => {
  const { assignedTruck, assignedDriverName, profile } = useAuth();
  const {
    filteredTrucks,
    filteredTrips,
    filteredFuelLogs,
    filteredExpenses,
    filteredPettyCash,
    calculatePettyCashBalance,
    logDriverRestBreak,
    exchangeRates
  } = useFleet();
  const { isDark } = useTheme();

  const [restBreakLoggedNotice, setRestBreakLoggedNotice] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isRestStopsModalOpen, setIsRestStopsModalOpen] = useState(false);

  // Active truck and trip
  const activeTruck = filteredTrucks[0];
  const activeTrip = filteredTrips.find((t) => t.status === 'in_progress') || filteredTrips[0];

  const truckReg = assignedTruck || activeTruck?.registration || 'JRB 216MP';
  const driverName = assignedDriverName || activeTruck?.driver || 'Tichaona';
  const driverPhone = profile?.phoneNumber || (truckReg === 'KBR 813MP' ? '+27 83 444 8921' : '+27 82 555 0192');

  // Real-time phone GPS tracker hook with stationary & fatigue detection
  const {
    gpsState,
    toggleGpsTracking,
    pingPhoneGpsNow,
    advanceSimulatedRoute,
    simulateStationaryTime,
    resetStationaryTimer,
    dismissStationaryAlert
  } = usePhoneGpsTracker(
    truckReg,
    driverName,
    driverPhone,
    true
  );
  const [gpsPingToast, setGpsPingToast] = useState(false);

  // Float calculations
  const floatBalanceUSD = calculatePettyCashBalance(truckReg);
  const currencyCode = truckReg === 'KBR 813MP' ? 'ZAR' : 'USD';
  const floatBalanceLocal = currencyCode === 'ZAR'
    ? (exchangeRates?.ZAR_USD ? floatBalanceUSD / exchangeRates.ZAR_USD : floatBalanceUSD * 18.3)
    : floatBalanceUSD;

  // HOS Continuous drive calculation
  const continuousDriveMinutes = activeTruck?.continuousDriveMinutes || 145;
  const driveHours = Math.floor(continuousDriveMinutes / 60);
  const driveMins = continuousDriveMinutes % 60;
  const maxDriveMinutes = 300; // 5 hours strict limit
  const percentDrive = Math.min(100, Math.round((continuousDriveMinutes / maxDriveMinutes) * 100));

  const isFatigueWarning = continuousDriveMinutes >= 240; // >4 hours
  const isFatigueAlert = continuousDriveMinutes >= 300;   // >=5 hours

  const handleLogRest = async () => {
    await logDriverRestBreak(truckReg);
    setRestBreakLoggedNotice(true);
    setTimeout(() => setRestBreakLoggedNotice(false), 5000);
  };

  // WhatsApp link for clearing agent
  const borderAgentPhone = '263772123456';
  const agentMessage = encodeURIComponent(
    `Hello Clearing Agent, this is driver ${driverName} with truck ${truckReg}. Trip Manifest: ${activeTrip?.customsManifestNumber || 'ZIM-CD3-2026-9041'}. Arrived at ${activeTrip?.borderCheckpoint || 'Beitbridge'} border gate. Please expedite customs CD3 verification.`
  );
  const agentWhatsAppUrl = `https://wa.me/${borderAgentPhone}?text=${agentMessage}`;

  const [activeConsoleSection, setActiveConsoleSection] = useState<'overview' | 'actions' | 'hos' | 'tyres'>('overview');

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12 px-2 sm:px-0">
      {/* Driver Mobile Companion Header */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-colors shadow-lg ${
        isDark ? 'bg-gradient-to-r from-[#0C152E] via-[#0E1B3E] to-[#14234E] border-[#1C2C54]' : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 border-blue-600 text-white'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isDark ? 'bg-blue-600/20 border-blue-500/40 text-sky-400' : 'bg-white/10 border-white/20 text-white'
            }`}>
              <Truck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-blue-500/20 text-sky-300 border border-blue-500/30' : 'bg-white/20 text-white'
                }`}>
                  In-Cab Mobile Driver
                </span>
                <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active On Route</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center space-x-2">
                <span>{truckReg}</span>
                <span className="text-xs font-normal opacity-80 hidden sm:inline">• {activeTruck?.make || 'Scania 6x4'}</span>
              </h1>
              <p className="text-xs opacity-90 mt-0.5 flex flex-wrap items-center gap-1">
                <span>Driver: <strong>{driverName}</strong></span>
                <span className="opacity-60">•</span>
                <span className="font-mono text-sky-300 flex items-center space-x-1">
                  <Smartphone className="w-3 h-3 inline" />
                  <span>{driverPhone}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            <div className={`rounded-xl p-2.5 sm:p-3 border text-left sm:text-right flex-1 sm:flex-initial sm:min-w-[170px] ${
              isDark ? 'bg-[#091024]/80 border-[#1B294D]' : 'bg-white/10 border-white/20'
            }`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">Cash Float in Cab</span>
              <span className="text-xl sm:text-2xl font-black font-mono tabular-nums block mt-0.5">
                {formatCurrency(floatBalanceLocal, currencyCode)}
              </span>
              <button
                onClick={() => onOpenPettyCashModal(truckReg)}
                className="text-[10px] text-amber-300 hover:underline font-bold mt-0.5 inline-block cursor-pointer"
              >
                + Request Top-up
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Driver Package Mode Switcher */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveConsoleSection('overview')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
              activeConsoleSection === 'overview'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">Trip Cab</span>
          </button>
          <button
            onClick={() => setActiveConsoleSection('actions')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
              activeConsoleSection === 'actions'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">Touch Logs</span>
          </button>
          <button
            onClick={() => setActiveConsoleSection('hos')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
              activeConsoleSection === 'hos'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">HOS & Rest</span>
          </button>
          <button
            onClick={() => setActiveConsoleSection('tyres')}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
              activeConsoleSection === 'tyres'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs">10 Tyres</span>
          </button>
        </div>
      </div>

      {/* Real-Time Phone GPS Beacon Telematics Card - Clean, zero-warning beacon */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
        isDark ? 'bg-[#0A1227] border-[#1D2E5C]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/40">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 border relative ${
              gpsState.isActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-700/30 text-slate-400 border-slate-600/40'
            }`}>
              <Radio className={`w-5 h-5 ${gpsState.isActive ? 'animate-pulse' : ''}`} />
              {gpsState.isActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  gpsState.isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {gpsState.isActive ? '● Live Phone GPS Beacon Active' : '○ Phone Tracking Paused'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Broadcasting: <strong className="text-sky-400">{driverPhone}</strong>
                </span>
              </div>
              <h3 className={`font-black text-sm mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {gpsState.milestone}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-stretch sm:self-auto">
            <button
              onClick={() => {
                pingPhoneGpsNow();
                setGpsPingToast(true);
                setTimeout(() => setGpsPingToast(false), 3000);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Ping GPS Now</span>
            </button>

            <button
              onClick={toggleGpsTracking}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors active:scale-95 ${
                gpsState.isActive
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {gpsState.isActive ? 'Tracking ON' : 'Paused'}
            </button>

            <button
              onClick={advanceSimulatedRoute}
              title="Forward to next checkpoint along corridor"
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
              }`}
            >
              ⏩
            </button>
          </div>
        </div>

        {/* Live Coordinates & Telematics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-xs font-mono">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-[#0E1733]' : 'bg-slate-50'}`}>
            <span className="text-[10px] text-slate-400 block font-sans">Phone Beacon Location</span>
            <span className="font-bold text-sky-400 block truncate">
              {gpsState.latitude ? `${gpsState.latitude.toFixed(4)}°S, ${gpsState.longitude?.toFixed(4)}°E` : 'Acquiring...'}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-[#0E1733]' : 'bg-slate-50'}`}>
            <span className="text-[10px] text-slate-400 block font-sans">Accuracy Radius</span>
            <span className="font-bold text-emerald-400 block">
              ±{gpsState.accuracyMeters || 6}m (Sensor Verified)
            </span>
          </div>

          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-[#0E1733]' : 'bg-slate-50'}`}>
            <span className="text-[10px] text-slate-400 block font-sans">Speed & Status</span>
            <span className={`font-bold block ${gpsState.stationaryAlertTriggered ? 'text-amber-400 animate-pulse' : gpsState.isStationary ? 'text-amber-300' : 'text-emerald-400'}`}>
              {gpsState.isStationary ? `Stopped (${gpsState.stationaryMinutes}m)` : `${gpsState.speedKmh} km/h • In Transit`}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-[#0E1733]' : 'bg-slate-50'}`}>
            <span className="text-[10px] text-slate-400 block font-sans">Fatigue Monitor (&gt;30m)</span>
            <span className={`font-bold block flex items-center space-x-1 ${
              gpsState.stationaryMinutes >= 30 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                gpsState.stationaryMinutes >= 30 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
              }`}></span>
              <span>{gpsState.stationaryMinutes >= 30 ? 'Alert Triggered' : `${gpsState.stationaryMinutes}/30 min Stop`}</span>
            </span>
          </div>
        </div>

        {/* Driver Fatigue Alerting Quick Controls */}
        <div className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-bold flex items-center space-x-1">
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>Driver Fatigue Test:</span>
            </span>
            <button
              onClick={() => simulateStationaryTime(35)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[11px] cursor-pointer transition-all active:scale-95 flex items-center space-x-1"
            >
              <span>Simulate 35m Stationary Stop</span>
            </button>
            {gpsState.stationaryMinutes > 0 && (
              <button
                onClick={resetStationaryTimer}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer transition-all"
              >
                Reset Stop
              </button>
            )}
          </div>

          <button
            onClick={() => setIsRestStopsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-bold text-[11px] flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Find Safe 24h Rest Stops (Google Maps)</span>
          </button>
        </div>

        {gpsPingToast && (
          <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Driver phone GPS ping transmitted successfully to dispatch console & corridor map!</span>
          </div>
        )}
      </div>

      {/* Rest Break Logged Confirmation Banner */}
      {restBreakLoggedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>45-Minute Rest Break Logged Successfully! Continuous drive timer reset to 0h.</span>
          </div>
          <span className="text-[10px] opacity-75 font-mono">Recorded in HOS Log</span>
        </div>
      )}

      {/* SECTION 1: TRIP OVERVIEW & ACTIVE STEPPER */}
      {(activeConsoleSection === 'overview' || activeConsoleSection === 'actions') && activeTrip && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
          isDark ? 'bg-[#0A1227] border-[#1D2E5C]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-500/20 text-sky-400 border border-blue-500/30">
                  {activeTrip.tripReferenceNumber || activeTrip.id}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {activeTrip.origin.split('/')[0]} → {activeTrip.destination.split('/')[0]}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Customer: <strong>{activeTrip.customerName || 'African Mineral Logistics'}</strong> • PO: <span className="font-mono text-emerald-400">{activeTrip.customerPoNumber || 'PO-ZIM-SA-88219'}</span>
              </p>
            </div>

            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-md cursor-pointer self-stretch sm:self-auto"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Open 5-Step Trip Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Interactive Progress Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            {/* Step 1: Pre-Trip */}
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                activeTrip.preTripInspection
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-300 animate-pulse'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider">1. Pre-Trip Check</span>
                {activeTrip.preTripInspection ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
              </div>
              <span className="font-mono font-bold text-xs mt-1">
                {activeTrip.preTripInspection ? `${activeTrip.departureOdometer} km Locked` : 'Pending Depot Lock'}
              </span>
            </button>

            {/* Step 2: Collection */}
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                activeTrip.collectionLog
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider">2. Shipper Waybill</span>
                {activeTrip.collectionLog ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Scale className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <span className="font-mono font-bold text-xs mt-1">
                {activeTrip.collectionLog ? `${activeTrip.collectionLog.waybillNumber}` : 'Capture at Shipper'}
              </span>
            </button>

            {/* Step 3: In-Transit */}
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                activeTrip.status === 'in_progress'
                  ? 'bg-blue-950/20 border-blue-500/30 text-sky-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider">3. Corridor Transit</span>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              </div>
              <span className="font-mono font-bold text-xs mt-1">
                {activeTrip.borderCheckpoint || 'Beitbridge'} Gate
              </span>
            </button>

            {/* Step 4: Delivery / POD */}
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                activeTrip.deliveryPod
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider">4. Consignee POD</span>
                {activeTrip.deliveryPod ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <span className="font-mono font-bold text-xs mt-1">
                {activeTrip.deliveryPod ? 'POD Signed & Stamped' : 'Sign at Consignee'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: BIG-TOUCH QUICK LOGGING TILES */}
      {(activeConsoleSection === 'actions' || activeConsoleSection === 'overview') && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Field Touch Actions
            </h2>
            <span className="text-[11px] text-sky-400 font-medium">1-Tap Driver Inputs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Action 1: Fuel Stop */}
            <button
              onClick={() => onOpenFuelModal(truckReg)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px] transition-all cursor-pointer active:scale-95 group ${
                isDark
                  ? 'bg-[#0E172F] hover:bg-[#131F3E] border-[#1D2B50] hover:border-blue-500/50 shadow-md'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <Fuel className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>Log Diesel Fill-up</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Liters, station & slip photo</span>
              </div>
            </button>

            {/* Action 2: Road Expense */}
            <button
              onClick={() => onOpenExpenseModal(truckReg)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px] transition-all cursor-pointer active:scale-95 group ${
                isDark
                  ? 'bg-[#0E172F] hover:bg-[#131F3E] border-[#1D2B50] hover:border-rose-500/50 shadow-md'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-rose-400 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>Log Road Expense</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Tolls, weighbridge, meals</span>
              </div>
            </button>

            {/* Action 3: Petty Cash Float */}
            <button
              onClick={() => onOpenPettyCashModal(truckReg)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px] transition-all cursor-pointer active:scale-95 group ${
                isDark
                  ? 'bg-[#0E172F] hover:bg-[#131F3E] border-[#1D2B50] hover:border-emerald-500/50 shadow-md'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-400 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>My Cash Float</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Top-up requests & float balance</span>
              </div>
            </button>

            {/* Action 4: SADC Transit Dossier */}
            <button
              onClick={() => {
                if (activeTrip) onOpenCustomsDossier(activeTrip);
              }}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px] transition-all cursor-pointer active:scale-95 group ${
                isDark
                  ? 'bg-[#0E172F] hover:bg-[#131F3E] border-[#1D2B50] hover:border-blue-500/50 shadow-md'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded">QR Seal</span>
              </div>
              <div>
                <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>SADC Transit Dossier</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Show CD3 & Waybill to Customs</span>
              </div>
            </button>

            {/* Action 5: Log 45m Rest Break */}
            <button
              onClick={handleLogRest}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px] transition-all cursor-pointer active:scale-95 group ${
                isFatigueAlert
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                  : isDark
                    ? 'bg-[#0E172F] hover:bg-[#131F3E] border-[#1D2B50] hover:border-amber-500/50 shadow-md'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-400 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <Coffee className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">HOS Reset</span>
              </div>
              <div>
                <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>Log 45m Rest Break</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Reset continuous drive counter</span>
              </div>
            </button>

            {/* Action 6: Border Clearing WhatsApp */}
            <a
              href={agentWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[110px] sm:min-h-[120px] transition-all cursor-pointer active:scale-95 group ${
                isDark
                  ? 'bg-[#0E172F] hover:bg-[#131F3E] border-[#1D2B50] hover:border-emerald-500/50 shadow-md'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-400 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>Expedite Border Agent</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">WhatsApp Beitbridge/Chirundu agent</span>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* SECTION 3: HOURS OF SERVICE & BORDER CLEARANCE */}
      {(activeConsoleSection === 'hos' || activeConsoleSection === 'overview') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HOS Drive Time Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-[#0C142A] border-[#19274D]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Hours of Service (HOS)</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isFatigueAlert
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isFatigueWarning
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isFatigueAlert ? 'Fatigue Alert — Stop Now' : isFatigueWarning ? 'Caution — Plan Rest' : 'Rested & Compliant'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Continuous Driving:</span>
                <span className="text-xl font-black font-mono tabular-nums">
                  {driveHours}h {driveMins}m <span className="text-xs font-normal text-slate-400">/ 5h 00m cap</span>
                </span>
              </div>
              <div className="w-full bg-slate-700/30 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    isFatigueAlert ? 'bg-rose-500' : isFatigueWarning ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${percentDrive}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Shift Total: {activeTruck?.shiftDriveHours || 5.5}h / 12h</span>
                <button
                  onClick={handleLogRest}
                  className="text-blue-500 hover:text-blue-400 font-bold underline cursor-pointer"
                >
                  Log 45m Rest Now
                </button>
              </div>
            </div>
          </div>

          {/* Border Gate Status Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-[#0C142A] border-[#19274D]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Border Clearance Status</span>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                isDark ? 'bg-blue-500/20 text-sky-300' : 'bg-blue-100 text-blue-800 font-bold'
              }`}>
                {activeTrip?.borderCheckpoint || 'Beitbridge'} Gate
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Phase:</span>
                <span className="font-bold text-sky-400 uppercase tracking-wide">
                  {activeTrip?.borderStatus === 'cd3_inspection'
                    ? 'ZIMRA Physical CD3 & Seal Check'
                    : activeTrip?.borderStatus === 'gate_queuing'
                      ? 'Commercial Gate Queuing'
                      : 'Pre-Clearance Bond Active'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Customs Manifest:</span>
                <span className="font-mono font-bold">{activeTrip?.customsManifestNumber || 'ZIM-CD3-2026-9041'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">GIT Insurance:</span>
                <span className="font-mono text-emerald-400 font-medium">{activeTrip?.gitPolicyNumber || 'GIT-SADC-99201-ZW'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: 10-TYRE WALKAROUND & VEHICLE HEALTH */}
      {(activeConsoleSection === 'tyres' || activeConsoleSection === 'overview') && (
        <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-[#0A1125] border-[#18264A]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                10-Wheel Chassis Tyre Status ({truckReg})
              </h3>
              <p className="text-[11px] text-slate-400">Walkaround PSI pressure & tread depth monitoring</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Odo: {activeTruck?.odometerKm?.toLocaleString() || '488,420'} km
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            {(activeTruck?.tyres || []).slice(0, 10).map((tyre, idx) => {
              const isWarning = tyre.status === 'warning' || tyre.pressurePsi < 100 || tyre.treadDepthMm < 9.0;

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isWarning
                      ? isDark
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                      : isDark
                        ? 'bg-[#0E1733] border-[#1E2E55] text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                    {tyre.position.split(' (')[0]}
                  </span>
                  <div className="font-black text-sm my-0.5">
                    {tyre.pressurePsi} <span className="text-[10px] font-normal">PSI</span>
                  </div>
                  <div className="text-[10px] flex items-center justify-center space-x-1">
                    <span className="opacity-75">{tyre.treadDepthMm}mm</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Driver's Recent Activity Table */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-[#0A1125] border-[#18264A]' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Recent Road Entries for {truckReg}
          </h3>
          <span className="text-[11px] text-slate-400">Synced to Dispatcher</span>
        </div>

        <div className="divide-y divide-slate-800/40 text-xs">
          {filteredExpenses.slice(0, 3).map((exp) => (
            <div key={exp.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Receipt className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{exp.description}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{exp.category}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-rose-400">
                -{formatCurrency(exp.amount, exp.currency)}
              </span>
            </div>
          ))}

          {filteredFuelLogs.slice(0, 2).map((fuel) => (
            <div key={fuel.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Fuel className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{fuel.stationName}</span>
                  <span className="text-[10px] text-slate-400">{fuel.litres} Liters</span>
                </div>
              </div>
              <span className="font-mono font-bold text-amber-400">
                {formatCurrency(fuel.cost, fuel.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Driver Trip Lifecycle Modal */}
      {activeTrip && (
        <DriverTripWorkflowModal
          isOpen={isWorkflowModalOpen}
          onClose={() => setIsWorkflowModalOpen(false)}
          trip={activeTrip}
          onOpenFuelModal={onOpenFuelModal}
          onOpenExpenseModal={onOpenExpenseModal}
        />
      )}

      {/* Driver Stationary & Fatigue Alert Toast (Triggered when stationary > 30 minutes) */}
      <DriverStationaryAlertToast
        isOpen={gpsState.stationaryAlertTriggered}
        onDismiss={dismissStationaryAlert}
        driverName={driverName}
        truckReg={truckReg}
        stationaryMinutes={gpsState.stationaryMinutes}
        onOpenRestStops={() => setIsRestStopsModalOpen(true)}
        onLogRestBreak={async () => {
          await handleLogRest();
          resetStationaryTimer();
        }}
      />

      {/* Safe Rest Stops Modal with Google Maps Grounding */}
      <NearbyRestStopsModal
        isOpen={isRestStopsModalOpen}
        onClose={() => setIsRestStopsModalOpen(false)}
        latitude={gpsState.latitude}
        longitude={gpsState.longitude}
        driverName={driverName}
        truckReg={truckReg}
        stationaryMinutes={gpsState.stationaryMinutes || 32}
        onLogRestBreak={async () => {
          await handleLogRest();
          resetStationaryTimer();
        }}
      />
    </div>
  );
};
