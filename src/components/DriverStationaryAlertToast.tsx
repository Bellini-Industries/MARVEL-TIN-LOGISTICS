import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Coffee,
  MapPin,
  AlertTriangle,
  X,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface DriverStationaryAlertToastProps {
  isOpen: boolean;
  onDismiss: () => void;
  driverName?: string;
  truckReg?: string;
  stationaryMinutes: number;
  onOpenRestStops: () => void;
  onLogRestBreak: () => void;
}

export const DriverStationaryAlertToast: React.FC<DriverStationaryAlertToastProps> = ({
  isOpen,
  onDismiss,
  driverName = 'Driver',
  truckReg = 'JRB 216MP',
  stationaryMinutes = 32,
  onOpenRestStops,
  onLogRestBreak
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <aside
      role="alert"
      aria-label="Driver Fatigue and Stationary Alert"
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] max-w-md w-[calc(100vw-2rem)] transition-all animate-bounce-in shadow-2xl"
    >
      <div
        className={`rounded-2xl border-2 p-4 shadow-2xl backdrop-blur-md flex flex-col space-y-3 ${
          isDark
            ? 'bg-[#0A132C]/95 border-amber-500/80 text-white shadow-amber-950/50'
            : 'bg-white/95 border-amber-500 text-slate-900 shadow-amber-500/20'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center">
              <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-amber-400 animate-pulse" />
              </span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                  Fatigue Alert
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {stationaryMinutes}m Stationary
                </span>
              </div>
              <h3 className="text-sm font-black tracking-tight mt-0.5">
                Driver Stationary &gt;30 Minutes
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message body */}
        <div className={`p-2.5 rounded-xl text-xs space-y-1 ${
          isDark ? 'bg-[#0E1B3E] text-slate-300' : 'bg-amber-50 text-amber-900 border border-amber-200'
        }`}>
          <p className="font-bold">
            {truckReg} ({driverName}) has been stopped for {stationaryMinutes} mins.
          </p>
          <p className="text-[11px] opacity-90 leading-relaxed">
            Prolonged stops during corridor transit are prime opportunities for fatigue recovery. Log a 45-minute HOS rest break or view verified 24-hour truckstops nearby.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onLogRestBreak}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Log Rest (45m)</span>
          </button>

          <button
            onClick={onOpenRestStops}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-300" />
            <span>Find Rest Stops</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
