import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Trip, TripStatus } from '../types';
import { extractTruckRegistration, formatCurrency, formatDateOnly } from '../utils/helpers';
import {
  Share2,
  ExternalLink,
  Plus,
  ArrowRight,
  User,
  Truck as TruckIcon,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Layers,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Phone,
  Radio
} from 'lucide-react';

interface FleetbaseBoardProps {
  onOpenTripModal: () => void;
  onOpenFuelModal?: (truckId?: string) => void;
  onOpenExpenseModal?: (truckId?: string) => void;
  onOpenPettyCashModal?: (truckId?: string) => void;
  onOpenCustomsDossier?: (trip: Trip) => void;
  viewMode?: 'board' | 'map' | 'overview';
  setViewMode?: (mode: 'board' | 'map' | 'overview') => void;
}

interface ColumnConfig {
  id: string;
  title: string;
  statusMatch: (trip: Trip) => boolean;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  targetNextStatus?: TripStatus;
  targetNextLabel?: string;
}

export const FleetbaseBoard: React.FC<FleetbaseBoardProps> = ({
  onOpenTripModal,
  onOpenFuelModal,
  onOpenExpenseModal,
  onOpenPettyCashModal,
  onOpenCustomsDossier,
  viewMode = 'board',
  setViewMode,
}) => {
  const { filteredTrips, updateTripStatus, trucks, calculatePettyCashBalance, selectedTruckFilter, setSelectedTruckFilter } = useFleet();
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const [selectedTripDetails, setSelectedTripDetails] = useState<Trip | null>(null);
  const [mobileColumnFilter, setMobileColumnFilter] = useState<string>('all');

  const columns: ColumnConfig[] = [
    {
      id: 'created',
      title: 'Created / Scheduled',
      statusMatch: (trip) => {
        return trip.status !== 'completed' && trip.status !== 'cancelled' && (trip.status as any) === 'created';
      },
      dotColor: 'bg-blue-400',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-500',
      targetNextStatus: 'in_progress',
      targetNextLabel: 'Dispatch'
    },
    {
      id: 'dispatched',
      title: 'Dispatched',
      statusMatch: (trip) => trip.status === 'in_progress',
      dotColor: 'bg-indigo-400',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-500',
      targetNextStatus: 'completed',
      targetNextLabel: 'Mark Delivered'
    },
    {
      id: 'enroute',
      title: 'Enroute Border',
      statusMatch: () => false,
      dotColor: 'bg-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-500',
      targetNextStatus: 'completed',
      targetNextLabel: 'Clear Customs'
    },
    {
      id: 'completed',
      title: 'Delivered',
      statusMatch: (trip) => trip.status === 'completed',
      dotColor: 'bg-emerald-400',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-500'
    }
  ];

  // Map trips to columns:
  const getTripsForColumn = (col: ColumnConfig): Trip[] => {
    if (col.id === 'created') {
      return filteredTrips.filter((t) => (t.status as any) === 'created' || t.status === 'cancelled');
    }
    if (col.id === 'dispatched') {
      return filteredTrips.filter((t) => t.status === 'in_progress' && !String(t.destination).includes('Lusaka'));
    }
    if (col.id === 'enroute') {
      return filteredTrips.filter((t) => t.status === 'in_progress' && String(t.destination).includes('Lusaka'));
    }
    if (col.id === 'completed') {
      return filteredTrips.filter((t) => t.status === 'completed');
    }
    return [];
  };

  const generateFleetbaseCode = (trip: Trip, index: number) => {
    const raw = trip.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `FLE${raw.slice(-8) || '48690187'}${index + 1}SG`;
  };

  const getCargoDescription = (trip: Trip) => {
    if (trip.origin.includes('Kamativi')) {
      return 'Tin Ore Concentrate (32 Metric Tons)';
    }
    if (trip.origin.includes('Johannesburg')) {
      return 'Mining Industrial Machinery & Spare Parts';
    }
    return 'Commercial Freight Container #MT-884';
  };

  return (
    <div className="space-y-4">
      {/* Board Header Bar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 border rounded-2xl p-4 text-xs transition-colors ${
        isDark ? 'bg-[#0d162d] border-[#1b2b4f] text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className={`font-black text-base tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Order Board
            </span>
            <span className="text-slate-400 font-medium">·</span>
            <span className="font-mono tabular-nums text-xs font-semibold text-blue-500">
              {filteredTrips.length} active
            </span>
          </div>

          <span className={`${isDark ? 'text-slate-600' : 'text-slate-300'} hidden sm:inline`}>|</span>

          {/* View Mode Switcher: Board | Map | KPIs */}
          {setViewMode && (
            <div className={`flex items-center rounded-xl p-1 text-xs border ${
              isDark ? 'bg-[#131f3d] border-[#213460]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'board'
                    ? 'bg-blue-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Orders Board</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Corridor Telemetry</span>
              </button>
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'overview'
                    ? 'bg-blue-600 text-white shadow-md'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Financial KPIs</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Truck Filter quick selector */}
          {isAdmin && (
            <div className={`flex items-center rounded-xl p-1 text-[11px] font-bold border ${
              isDark ? 'bg-[#131f3d] border-[#213460]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setSelectedTruckFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTruckFilter === 'ALL'
                    ? isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Fleet
              </button>
              <button
                onClick={() => setSelectedTruckFilter('JRB 216MP')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTruckFilter === 'JRB 216MP'
                    ? isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                JRB 216MP
              </button>
              <button
                onClick={() => setSelectedTruckFilter('KBR 813MP')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTruckFilter === 'KBR 813MP'
                    ? isDark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KBR 813MP
              </button>
            </div>
          )}

          <span className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            isDark
              ? 'bg-[#131f3d] text-emerald-300 border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Live Telematics</span>
          </span>

          <button
            onClick={onOpenTripModal}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Dispatch</span>
          </button>
        </div>
      </div>

      {/* Mobile Column Segmented Control (phone screens < 768px) */}
      <div className="md:hidden flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setMobileColumnFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
            mobileColumnFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : isDark ? 'bg-[#131f3d] text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
          }`}
        >
          All Stages ({filteredTrips.length})
        </button>
        {columns.map((col) => {
          const count = getTripsForColumn(col).length;
          const isSelected = mobileColumnFilter === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setMobileColumnFilter(col.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'bg-[#131f3d] text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>{col.title.split('/')[0].trim()}</span>
              <span className="font-mono tabular-nums text-[11px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Grid - responsive on desktop/tablet, filtered/stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTrips = getTripsForColumn(col);
          const isHiddenOnMobile = mobileColumnFilter !== 'all' && mobileColumnFilter !== col.id;

          return (
            <div
              key={col.id}
              className={`rounded-xl flex-col min-w-[280px] shadow-lg overflow-hidden border transition-colors ${
                isHiddenOnMobile ? 'hidden md:flex' : 'flex'
              } ${
                isDark ? 'bg-[#0e172e] border-[#1C2A4D]' : 'bg-slate-100/80 border-slate-200'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b flex items-center justify-between ${
                isDark ? 'border-[#1C2A4D] bg-[#121D3B]' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`}></span>
                  <span className={`font-bold text-xs tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {col.title}
                  </span>
                </div>
                <span className={`font-mono tabular-nums font-semibold px-2 py-0.5 rounded text-[11px] ${
                  isDark ? 'bg-[#1B294F] text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {colTrips.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="p-3 space-y-3 flex-1 min-h-[180px]">
                {colTrips.length === 0 ? (
                  <div className={`h-32 flex flex-col items-center justify-center text-xs border border-dashed rounded-lg p-4 text-center ${
                    isDark ? 'border-[#1F2E52] text-slate-500' : 'border-slate-300 text-slate-500'
                  }`}>
                    <span>No orders in this stage</span>
                  </div>
                ) : (
                  colTrips.map((trip, idx) => {
                    const truckReg = extractTruckRegistration(trip.truckId);
                    const code = generateFleetbaseCode(trip, idx);
                    const cargo = getCargoDescription(trip);
                    const associatedTruck = trucks.find(
                      (t) => t.registration === truckReg || t.registration.includes(truckReg)
                    );
                    const phoneGps = associatedTruck?.phoneGpsTelemetry;
                    const driverPhone = associatedTruck?.driverPhone || phoneGps?.driverPhone;

                    return (
                      <div
                        key={trip.id}
                        className={`rounded-xl p-3.5 text-xs shadow-md transition-all space-y-3 cursor-pointer group border active:scale-[0.99] ${
                          isDark
                            ? 'bg-[#131E36] hover:bg-[#162442] border-[#1F2E52] hover:border-blue-500/50 text-white'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-900'
                        }`}
                        onClick={() => setSelectedTripDetails(trip)}
                      >
                        {/* Order ID & Status line - unboxed clean typography */}
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-xs font-bold tracking-tight ${
                            isDark ? 'text-sky-300' : 'text-blue-600'
                          }`}>
                            {code}
                          </span>
                          <span className={`text-[11px] font-semibold tracking-tight capitalize ${col.badgeText}`}>
                            {trip.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Route Pick-up & Drop-off */}
                        <div className={`rounded-lg p-2.5 border space-y-2 ${
                          isDark ? 'bg-[#0B132B] border-[#1A2748]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-start justify-between text-[11px]">
                            <div className="flex-1 pr-1">
                              <span className={`text-[9px] uppercase font-bold block tracking-wider ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                PICKUP
                              </span>
                              <span className={`font-semibold block truncate ${
                                isDark ? 'text-slate-200' : 'text-slate-900'
                              }`} title={trip.origin}>
                                {trip.origin.split(',')[0]}
                              </span>
                              <span className={`text-[10px] block truncate ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                {trip.origin.split(',')[1] || 'ZIM Depot'}
                              </span>
                            </div>

                            {/* Divider line */}
                            <div className={`flex flex-col items-center justify-center px-1 pt-3 ${
                              isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              <span className="text-[10px] font-mono tracking-widest">&rarr;</span>
                            </div>

                            <div className="flex-1 pl-1 text-right">
                              <span className={`text-[9px] uppercase font-bold block tracking-wider ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                DROPOFF
                              </span>
                              <span className={`font-semibold block truncate ${
                                isDark ? 'text-slate-200' : 'text-slate-900'
                              }`} title={trip.destination}>
                                {trip.destination.split(',')[0]}
                              </span>
                              <span className={`text-[10px] block truncate ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}>
                                {trip.destination.split(',')[1] || 'Container Port'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customer & Assigned Driver Bar */}
                        <div className={`grid grid-cols-2 gap-2 text-[11px] pt-1 border-t ${
                          isDark ? 'border-[#1F2E52]/80 text-slate-400' : 'border-slate-200 text-slate-600'
                        }`}>
                          <div>
                            <span className="text-[9px] uppercase font-bold block">CARGO</span>
                            <span className={`font-semibold block truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{cargo}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold block">DRIVER · VEHICLE</span>
                            <span className={`font-semibold block truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                              {trip.driver} · {truckReg.split(' ')[0]}
                            </span>
                            {driverPhone && (
                              <span className="text-[10px] font-mono text-sky-400 block truncate">
                                {driverPhone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Driver Phone GPS Beacon Live Indicator */}
                        {phoneGps?.pingedFromPhone && (
                          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-mono border ${
                            isDark ? 'bg-sky-950/40 border-sky-800/60 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                          }`}>
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                              </span>
                              <Smartphone className="w-3 h-3 text-sky-400 shrink-0" />
                              <span className="font-bold truncate">Phone GPS Active</span>
                            </div>
                            <span className="font-bold shrink-0">
                              {Math.round(phoneGps.speedKmh ?? 0)} km/h · ±{Math.round(phoneGps.accuracyMeters ?? 8)}m
                            </span>
                          </div>
                        )}

                        {/* Action buttons inside card */}
                        <div className="pt-2 flex items-center justify-between gap-1 text-[11px]">
                          <div className={`flex items-center space-x-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3" />
                            <span className="font-mono tabular-nums">{formatDateOnly(trip.startDate)}</span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {col.targetNextStatus && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTripStatus(trip.id, col.targetNextStatus!);
                                }}
                                className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white rounded text-[11px] font-bold border border-blue-500/40 transition-colors cursor-pointer"
                              >
                                {col.targetNextLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Column footer button: + Add a dispatch */}
                <button
                  onClick={onOpenTripModal}
                  className={`w-full py-2.5 px-3 border border-dashed rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#1F2E52] hover:border-blue-500 hover:bg-blue-500/10 text-slate-400 hover:text-blue-300'
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add a dispatch</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedTripDetails && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`animate-modal-enter border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-[#111C38] border-[#1F2E52] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-[#1F2E52]' : 'border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Dispatch Details</span>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedTripDetails.id}</h3>
              </div>
              <button
                onClick={() => setSelectedTripDetails(null)}
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-[#0B132B] border-[#1A2748]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Corridor Route</span>
                  <div className={`font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedTripDetails.origin} &rarr; {selectedTripDetails.destination}
                  </div>
                </div>
                <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div>
                    <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Assigned Hauler</span>
                    <div className="font-mono font-bold text-blue-500">{extractTruckRegistration(selectedTripDetails.truckId)}</div>
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Assigned Driver</span>
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedTripDetails.driver}</div>
                  </div>
                </div>

                {/* Driver Phone & Live GPS Ping */}
                {(() => {
                  const selReg = extractTruckRegistration(selectedTripDetails.truckId);
                  const selTruck = trucks.find(t => t.registration === selReg || t.registration.includes(selReg));
                  const phoneGps = selTruck?.phoneGpsTelemetry;
                  const driverPhone = selTruck?.driverPhone || phoneGps?.driverPhone;

                  return (
                    <div className={`pt-2 border-t space-y-1.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      {driverPhone && (
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] flex items-center space-x-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Phone className="w-3 h-3 inline text-sky-400" />
                            <span>Driver Mobile:</span>
                          </span>
                          <span className="font-mono font-bold text-sky-400">{driverPhone}</span>
                        </div>
                      )}

                      {phoneGps?.pingedFromPhone && (
                        <div className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                          isDark ? 'bg-sky-950/30 border-sky-800/50 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                        }`}>
                          <div className="flex items-center space-x-1.5 font-bold">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                            </span>
                            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                            <span>Driver Phone GPS Beacon Active</span>
                          </div>
                          <div className="flex justify-between font-mono text-[10px] opacity-90">
                            <span>Speed: {Math.round(phoneGps.speedKmh ?? 0)} km/h</span>
                            <span>Accuracy: ±{Math.round(phoneGps.accuracyMeters ?? 6)}m</span>
                            {phoneGps.heading !== undefined && <span>Heading: {Math.round(phoneGps.heading)}°</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Staged Enhancements: Customs Dossier & WhatsApp Driver Push */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  onClick={() => {
                    if (onOpenCustomsDossier) {
                      onOpenCustomsDossier(selectedTripDetails);
                      setSelectedTripDetails(null);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                    isDark ? 'bg-[#0f1938] border-blue-500/40 text-sky-300 hover:bg-blue-600 hover:text-white' : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Customs Pack Dossier</span>
                </button>

                <button
                  onClick={() => {
                    const truckReg = extractTruckRegistration(selectedTripDetails.truckId);
                    const text = encodeURIComponent(
                      `*MARVEL TIN DISPATCH ORDER*\n` +
                      `*Truck:* ${truckReg} | Driver: ${selectedTripDetails.driver}\n` +
                      `*From:* ${selectedTripDetails.origin}\n` +
                      `*To:* ${selectedTripDetails.destination}\n` +
                      `*Cargo:* ${selectedTripDetails.cargo || 'Tin Ore Concentrate (32 MT)'}\n` +
                      `*CD3 Manifest:* ${selectedTripDetails.customsManifestNumber || 'ZIM-CD3-9041'}\n` +
                      `Safe transit on corridor!`
                    );
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                  className="py-2 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Dispatch</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Current Status:</span>
                <select
                  value={selectedTripDetails.status}
                  onChange={(e) => {
                    updateTripStatus(selectedTripDetails.id, e.target.value as TripStatus);
                    setSelectedTripDetails({
                      ...selectedTripDetails,
                      status: e.target.value as TripStatus
                    });
                  }}
                  className={`border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${
                    isDark ? 'bg-[#0B132B] border-[#1A2748] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="in_progress">Dispatched / In Transit</option>
                  <option value="completed">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className={`pt-2 border-t flex justify-end ${isDark ? 'border-[#1F2E52]' : 'border-slate-200'}`}>
              <button
                onClick={() => setSelectedTripDetails(null)}
                className={`px-4 py-2 font-bold rounded-xl text-xs cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
