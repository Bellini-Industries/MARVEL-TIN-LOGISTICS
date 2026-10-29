import React, { useState } from 'react';
import { TripStatus } from '../types';
import { X, Route, MapPin, Calendar, Truck } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { Timestamp } from 'firebase/firestore';

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruckId?: string;
}

export const AddTripModal: React.FC<AddTripModalProps> = ({ isOpen, onClose, defaultTruckId }) => {
  const { addTrip } = useFleet();
  const { assignedTruck, isAdmin } = useAuth();

  const [truckId, setTruckId] = useState<string>(defaultTruckId || assignedTruck || 'JRB 216MP');
  const [driver, setDriver] = useState<string>(truckId === 'KBR 813MP' ? 'Anthony' : 'Tichaona');
  const [tripRef, setTripRef] = useState<string>(`TRP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState<string>('African Mineral Logistics (Pty) Ltd');
  const [customerPoNumber, setCustomerPoNumber] = useState<string>('PO-ZIM-SA-88219');
  const [cargo, setCargo] = useState<string>('Tin Ore Concentrate (32 Metric Tons)');
  const [weightTons, setWeightTons] = useState<string>('32.4');
  const [palletCount, setPalletCount] = useState<string>('24');
  const [agreedRateAmount, setAgreedRateAmount] = useState<string>('4850');
  const [agreedRateType, setAgreedRateType] = useState<'per_trip' | 'per_ton' | 'per_km'>('per_trip');
  const [isCrossBorder, setIsCrossBorder] = useState<boolean>(true);
  const [borderPost, setBorderPost] = useState<string>('Beitbridge');
  const [clearingAgent, setClearingAgent] = useState<string>('BridgeLink Customs Clearing');
  const [origin, setOrigin] = useState<string>('Kamativi Tin Mine / Harare Depot, ZIM');
  const [destination, setDestination] = useState<string>('Durban Port Pier 2, SA');
  const [status, setStatus] = useState<TripStatus>('in_progress');
  const [startDateStr, setStartDateStr] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDateStr, setEndDateStr] = useState<string>(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTruckChange = (reg: string) => {
    setTruckId(reg);
    if (reg === 'KBR 813MP') {
      setDriver('Anthony');
    } else {
      setDriver('Tichaona');
    }
  };

  const corridorPresets = [
    { origin: 'Kamativi Tin Mine, ZIM', dest: 'Durban Port Pier 2, SA', cargo: 'Tin Ore Concentrate (32T)', border: 'Beitbridge' },
    { origin: 'Johannesburg Logistics Hub, SA', dest: 'Chirundu Border / Lusaka, ZAM', cargo: 'Mining Machinery & Spares', border: 'Chirundu' },
    { origin: 'Harare Operations Depot, ZIM', dest: 'Johannesburg Pomona Park, SA', cargo: 'Industrial Minerals', border: 'Beitbridge' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !driver) {
      return;
    }

    setSubmitting(true);
    try {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const parsedRate = parseFloat(agreedRateAmount) || 4850;
      const parsedWeight = parseFloat(weightTons) || 30;

      await addTrip({
        tripReferenceNumber: tripRef.trim(),
        customerName: customerName.trim(),
        customerPoNumber: customerPoNumber.trim(),
        cargo: cargo.trim(),
        weightTons: parsedWeight,
        palletCount: parseInt(palletCount) || 20,
        agreedRate: {
          type: agreedRateType,
          rate: parsedRate,
          currency: 'USD'
        },
        revenueUSD: agreedRateType === 'per_ton' ? parsedRate * parsedWeight : parsedRate,
        totalKm: 1680,
        isCrossBorder,
        borderCheckpoint: isCrossBorder ? (borderPost as any) : undefined,
        borderPostName: isCrossBorder ? borderPost : undefined,
        clearingAgentName: isCrossBorder ? clearingAgent : undefined,
        customsManifestNumber: isCrossBorder ? `ZIM-CD3-2026-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
        gitPolicyNumber: 'GIT-SADC-99201-ZW',
        truckId,
        driver,
        origin,
        destination,
        status,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end)
      });
      onClose();
    } catch {
      // Handled gracefully
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="animate-modal-enter bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <Route className="w-5 h-5" />
            <h3 className="font-bold text-lg text-white">Dispatch New Trip</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Truck and Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Truck Registration *
              </label>
              {isAdmin ? (
                <select
                  value={truckId}
                  onChange={(e) => handleTruckChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="JRB 216MP">JRB 216MP</option>
                  <option value="KBR 813MP">KBR 813MP</option>
                </select>
              ) : (
                <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-amber-300 font-bold">
                  {assignedTruck || truckId}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Driver Name *
              </label>
              <input
                type="text"
                required
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder="Driver name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Trip Reference & Customer PO Number (Part 1 A) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1.5">
                Trip / Load Ref *
              </label>
              <input
                type="text"
                required
                value={tripRef}
                onChange={(e) => setTripRef(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                placeholder="TRP-2026-XXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
                Customer PO Number * [SARS INVOICE TRIGGER]
              </label>
              <input
                type="text"
                required
                value={customerPoNumber}
                onChange={(e) => setCustomerPoNumber(e.target.value)}
                className="w-full bg-slate-800 border border-emerald-500/50 rounded-xl px-3.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                placeholder="e.g. PO-ZIM-SA-88219"
              />
            </div>
          </div>

          {/* Customer Name & Cargo Commodity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Customer Name & Account Code *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                placeholder="Customer company name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Cargo Description (Commodity) *
              </label>
              <input
                type="text"
                required
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                placeholder="e.g. Tin Ore Concentrate"
              />
            </div>
          </div>

          {/* Weight, Pallets & Agreed Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Weight (Tons) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weightTons}
                onChange={(e) => setWeightTons(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                placeholder="32.4"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Pallet Count
              </label>
              <input
                type="number"
                value={palletCount}
                onChange={(e) => setPalletCount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                placeholder="24"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Agreed Rate (USD) *
              </label>
              <input
                type="number"
                required
                value={agreedRateAmount}
                onChange={(e) => setAgreedRateAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                placeholder="4850"
              />
            </div>
          </div>

          {/* Preset Corridor Routes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Corridor Route Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {corridorPresets.map((p) => (
                <button
                  type="button"
                  key={`${p.origin}-${p.dest}`}
                  onClick={() => {
                    setOrigin(p.origin);
                    setDestination(p.dest);
                  }}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors"
                >
                  {p.origin.split(' ')[0]} → {p.dest.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Origin and Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Origin *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-emerald-400" />
                <input
                  type="text"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Harare Depot, ZIM"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Destination *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-rose-400" />
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Durban Port, SA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Expected Arrival Date
              </label>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Trip Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TripStatus)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
