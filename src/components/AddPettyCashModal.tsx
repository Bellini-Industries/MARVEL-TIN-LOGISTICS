import React, { useState, useEffect } from 'react';
import { PettyCashType, CurrencyCode } from '../types';
import {
  X,
  Wallet,
  ArrowDownRight,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  PlusCircle,
  Truck
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, convertToUSD } from '../utils/helpers';

interface AddPettyCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruckId?: string;
}

export const AddPettyCashModal: React.FC<AddPettyCashModalProps> = ({
  isOpen,
  onClose,
  defaultTruckId,
}) => {
  const { addPettyCash, calculatePettyCashBalance, exchangeRates } = useFleet();
  const { assignedTruck, isAdmin } = useAuth();

  const [truckId, setTruckId] = useState<string>(
    defaultTruckId || assignedTruck || 'JRB 216MP'
  );
  const [amount, setAmount] = useState<string>('500.00');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [disbursementSource, setDisbursementSource] = useState<string>(
    'Harare Head Office Dispatch Float'
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync default truck
  useEffect(() => {
    if (defaultTruckId) {
      setTruckId(defaultTruckId);
    } else if (assignedTruck && !isAdmin) {
      setTruckId(assignedTruck);
    }
  }, [defaultTruckId, assignedTruck, isAdmin]);

  if (!isOpen) return null;

  const currentBalanceUSD = calculatePettyCashBalance(truckId);
  const parsedAmount = parseFloat(amount) || 0;
  const topUpAmountUSD = convertToUSD(parsedAmount, currency, exchangeRates);
  const projectedBalanceUSD = currentBalanceUSD + topUpAmountUSD;

  const commonSources = [
    'Harare Head Office Dispatch Float',
    'Johannesburg Logistics Depot Float',
    'Beitbridge Emergency Cash Advance',
    'Durban Port Transit Disbursement',
    'Zambia Chirundu Border Cash Top-Up'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!truckId) {
      setErrorMsg('Please select a truck.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid top-up amount.');
      return;
    }

    setSubmitting(true);
    try {
      await addPettyCash({
        truckId,
        tripId: 'corridor_general',
        type: 'top_up',
        amount: parsedAmount,
        currency,
        balanceAfter: Number(projectedBalanceUSD.toFixed(2)),
        linkedExpenseId: disbursementSource || 'Head Office Float Top-Up',
        timestamp: new Date(),
      });

      setSuccessMsg('Petty cash float top-up recorded and balance updated!');

      setTimeout(() => {
        setAmount('');
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Top-up error:', err);
      setErrorMsg('Failed to process top-up. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="animate-modal-enter bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-2.5 text-emerald-400">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Log Petty Cash Top-Up</h3>
              <p className="text-[11px] text-slate-400">Driver Float Account & Running Cash Balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Truck Selection */}
          <div>
            <label htmlFor="topup-truck" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Truck Float Account *
            </label>
            <select
              id="topup-truck"
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-semibold focus:outline-none focus:border-emerald-500 text-sm"
              required
            >
              <option value="JRB 216MP">JRB 216MP — Scania R500 (Driver: Tichaona)</option>
              <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Driver: Anthony)</option>
            </select>
          </div>

          {/* Real-Time Balance Status Panel */}
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Current Truck Balance:</span>
              <span className="text-base font-black text-white font-mono">
                {formatCurrency(currentBalanceUSD, 'USD')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">+ Deposit Amount (USD Equiv):</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                +{formatCurrency(topUpAmountUSD, 'USD')}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold uppercase tracking-wider">
                Updated Balance After Top-Up:
              </span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                {formatCurrency(projectedBalanceUSD, 'USD')}
              </span>
            </div>
          </div>

          {/* Top-up Amount and Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="topup-amount" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Top-Up Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="topup-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-3 text-white font-mono focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="topup-currency" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Currency *
              </label>
              <select
                id="topup-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 text-sm cursor-pointer"
                required
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="ZAR">ZAR (R - South African Rand)</option>
                <option value="BWP">BWP (P - Botswana Pula)</option>
                <option value="ZMW">ZMW (K - Zambian Kwacha)</option>
              </select>
            </div>
          </div>

          {/* Disbursement Source / Description */}
          <div>
            <label htmlFor="topup-source" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Disbursement Source / Description *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                id="topup-source"
                type="text"
                required
                value={disbursementSource}
                onChange={(e) => setDisbursementSource(e.target.value)}
                placeholder="e.g. Harare Head Office Cash Float, Johannesburg Depot"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {/* Quick Source Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {commonSources.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setDisbursementSource(source)}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin text-slate-950" />}
              <span>{submitting ? 'Recording Deposit...' : 'Record Float Top-Up'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
