import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Trip, TripStatus } from '../types';
import { formatDateTime, formatDateOnly, extractTruckRegistration, convertToZAR, formatCurrency, matchesTrip } from '../utils/helpers';
import {
  Route,
  MapPin,
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  PlayCircle,
  Truck,
  PieChart,
  ArrowRight,
  Receipt,
  Fuel,
  Wrench,
  DollarSign
} from 'lucide-react';
import { TripCostSummaryView } from './TripCostSummaryView';

interface TripsViewProps {
  onOpenTripModal: () => void;
}

export const TripsView: React.FC<TripsViewProps> = ({ onOpenTripModal }) => {
  const { filteredTrips, updateTripStatus, fuelLogs, expenses, maintenance, exchangeRates } = useFleet();
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'trips' | 'cost_summary'>('trips');
  const [selectedTripIdForCost, setSelectedTripIdForCost] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TripStatus>('ALL');

  const displayedTrips = filteredTrips.filter((trip) => {
    if (statusFilter === 'ALL') return true;
    return trip.status === statusFilter;
  });

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-500">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>In Transit</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Delivered</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  /**
   * Calculate quick summary total in ZAR for a trip card
   */
  const calculateQuickTripZAR = (tripId: string) => {
    const fuelCostZAR = fuelLogs
      .filter((l) => matchesTrip(l.tripId, tripId))
      .reduce((sum, item) => sum + convertToZAR(item.cost, item.currency, exchangeRates), 0);

    const expenseCostZAR = expenses
      .filter((e) => matchesTrip(e.tripId, tripId))
      .reduce((sum, item) => sum + convertToZAR(item.amount, item.currency, exchangeRates), 0);

    const maintCostZAR = maintenance
      .filter((m) => matchesTrip(m.tripId, tripId))
      .reduce((sum, item) => sum + convertToZAR(item.cost, item.currency, exchangeRates), 0);

    return fuelCostZAR + expenseCostZAR + maintCostZAR;
  };

  return (
    <div className="space-y-6">
      {/* View Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl sm:text-2xl font-black flex items-center space-x-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Route className="w-6 h-6 text-blue-500" />
            <span>Freight Trips & Corridor Dispatches</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cross-border transit corridors between Zimbabwe, South Africa, and Zambia
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main View Toggle */}
          <div className={`flex items-center p-1 rounded-xl text-xs border ${
            isDark ? 'bg-[#0e172e] border-[#1c2c52]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('trips')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'trips'
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Freight Trips
            </button>
            <button
              onClick={() => setViewMode('cost_summary')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'cost_summary'
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Trip Cost Summary</span>
            </button>
          </div>

          {viewMode === 'trips' && (
            <button
              onClick={onOpenTripModal}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* Render either Cost Summary View or Standard Trips List */}
      {viewMode === 'cost_summary' ? (
        <TripCostSummaryView
          selectedTripId={selectedTripIdForCost || (displayedTrips[0]?.id ?? '')}
          onSelectTripId={(id) => setSelectedTripIdForCost(id)}
          onClose={() => setViewMode('trips')}
        />
      ) : (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className={`flex items-center justify-between rounded-xl p-3 px-4 text-xs shadow-md border transition-colors ${
            isDark ? 'bg-[#0e172e] border-[#1c2c52]' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center space-x-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span className="font-bold uppercase tracking-wider text-[11px] text-blue-500">Status:</span>
              <div className="flex items-center space-x-1">
                {(['ALL', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-[#131f3d]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'in_progress' ? 'In Transit' : st}
                  </button>
                ))}
              </div>
            </div>

            <span className={`text-[11px] font-medium hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{displayedTrips.length}</strong> of {filteredTrips.length} trips
            </span>
          </div>

          {/* Trips Cards List */}
          {displayedTrips.length === 0 ? (
            <div className={`rounded-2xl p-12 text-center shadow-xl border ${
              isDark ? 'bg-[#0e172e] border-[#1c2c52]' : 'bg-white border-slate-200'
            }`}>
              <Route className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>No trips match filter</h3>
              <p className={`text-xs max-w-sm mx-auto mt-1 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {statusFilter === 'ALL'
                  ? 'No freight dispatches found for the selected fleet.'
                  : `No dispatches currently marked as "${statusFilter}".`}
              </p>
              <button
                onClick={onOpenTripModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Create New Dispatch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedTrips.map((trip) => {
                const truckReg = extractTruckRegistration(trip.truckId);
                const quickZAR = calculateQuickTripZAR(trip.id);

                return (
                  <div
                    key={trip.id}
                    className={`rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4 hover:border-blue-500/50 transition-all border ${
                      isDark ? 'bg-[#0e172e] border-[#1c2c52] text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    {/* Header: Truck & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className={`font-mono text-xs font-black tracking-wider px-2.5 py-1 rounded-lg border shadow-inner ${
                          isDark ? 'text-sky-300 bg-[#070d1e] border-sky-400/30' : 'text-blue-900 bg-blue-50 border-blue-200'
                        }`}>
                          {truckReg}
                        </span>
                        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Driver: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{trip.driver}</strong>
                        </span>
                      </div>
                      <div>{getStatusBadge(trip.status)}</div>
                    </div>

                    {/* Route Waypoints */}
                    <div className={`relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 ${
                      isDark ? 'before:bg-[#1a284c]' : 'before:bg-slate-200'
                    }`}>
                      <div className="relative">
                        <span className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ${
                          isDark ? 'ring-[#0e172e]' : 'ring-white'
                        }`} />
                        <span className={`text-[10px] uppercase tracking-wider block font-bold ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Origin Dispatch
                        </span>
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.origin}</span>
                      </div>

                      <div className="relative">
                        <span className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-rose-400 ring-4 ${
                          isDark ? 'ring-[#0e172e]' : 'ring-white'
                        }`} />
                        <span className={`text-[10px] uppercase tracking-wider block font-bold ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Destination / Terminal
                        </span>
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{trip.destination}</span>
                      </div>
                    </div>

                    {/* Cost Preview & Action to Open Trip Cost Summary */}
                    <div className={`rounded-xl p-3 flex items-center justify-between text-xs border ${
                      isDark ? 'bg-[#121c38] border-[#1d2d57]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold block ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Total Trip Spend (ZAR)
                        </span>
                        <span className={`text-base font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(quickZAR, 'ZAR')}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTripIdForCost(trip.id);
                          setViewMode('cost_summary');
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        <PieChart className="w-3.5 h-3.5 text-blue-200" />
                        <span>Trip Cost Summary</span>
                      </button>
                    </div>

                    {/* Dates & Quick Status Control */}
                    <div className={`pt-2 border-t flex items-center justify-between text-xs ${
                      isDark ? 'border-[#1a284c] text-slate-400' : 'border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center space-x-3 text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span>{formatDateOnly(trip.startDate)}</span>
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <div className="flex items-center space-x-1">
                          <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span>{formatDateOnly(trip.endDate)}</span>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={trip.status}
                        onChange={(e) => updateTripStatus(trip.id, e.target.value as TripStatus)}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer border ${
                          isDark ? 'bg-[#070d1e] border-[#1b2b4f] text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="in_progress">In Transit</option>
                        <option value="completed">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
