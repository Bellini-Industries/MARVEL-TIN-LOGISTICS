import React, { useState, useEffect } from 'react';
import { X, RefreshCw, TrendingUp, Calculator, Check, ArrowRight } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { convertCurrency, formatCurrency } from '../utils/helpers';
import { CurrencyCode } from '../types';

interface ExchangeRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExchangeRatesModal: React.FC<ExchangeRatesModalProps> = ({ isOpen, onClose }) => {
  const { exchangeRates, updateExchangeRates } = useFleet();
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();

  const [zarUsd, setZarUsd] = useState<string>('0.0545');
  const [bwpZar, setBwpZar] = useState<string>('1.35');
  const [zmwZar, setZmwZar] = useState<string>('0.68');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Currency Converter Calculator state
  const [calcAmount, setCalcAmount] = useState<string>('1000');
  const [calcFrom, setCalcFrom] = useState<CurrencyCode>('ZAR');
  const [calcTo, setCalcTo] = useState<CurrencyCode>('USD');

  useEffect(() => {
    if (exchangeRates) {
      setZarUsd(String(exchangeRates.ZAR_USD || 0.0545));
      setBwpZar(String(exchangeRates.BWP_ZAR || 1.35));
      setZmwZar(String(exchangeRates.ZMW_ZAR || 0.68));
    }
  }, [exchangeRates]);

  if (!isOpen) return null;

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateExchangeRates({
        ZAR_USD: parseFloat(zarUsd) || 0.0545,
        BWP_ZAR: parseFloat(bwpZar) || 1.35,
        ZMW_ZAR: parseFloat(zmwZar) || 0.68
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.warn('Failed to update exchange rates in Firestore (local state updated):', err);
    } finally {
      setSaving(false);
    }
  };

  const calculatedResult = convertCurrency(
    parseFloat(calcAmount) || 0,
    calcFrom,
    calcTo,
    exchangeRates
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Southern Africa Exchange Rates</h3>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          {/* Quick Rate Overview */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ZAR / USD</span>
              <span className="text-base font-bold text-amber-500">{zarUsd}</span>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1 ZAR = ${zarUsd}</span>
            </div>
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>BWP / ZAR</span>
              <span className="text-base font-bold text-blue-500">{bwpZar}</span>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1 Pula = R{bwpZar}</span>
            </div>
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] block font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ZMW / ZAR</span>
              <span className="text-base font-bold text-emerald-500">{zmwZar}</span>
              <span className={`text-[10px] block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1 Kwacha = R{zmwZar}</span>
            </div>
          </div>

          {/* Interactive Live Converter */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex items-center space-x-2 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Calculator className="w-4 h-4 text-emerald-500" />
              <span>Multi-Currency Route Calculator</span>
            </div>
            <div className="grid grid-cols-5 gap-2 items-center">
              <div className="col-span-2">
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <select
                  value={calcFrom}
                  onChange={(e) => setCalcFrom(e.target.value as CurrencyCode)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs font-bold"
                >
                  <option value="ZAR">ZAR</option>
                  <option value="USD">USD</option>
                  <option value="BWP">BWP</option>
                  <option value="ZMW">ZMW</option>
                </select>
              </div>
              <div className="flex justify-center text-slate-500">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <select
                  value={calcTo}
                  onChange={(e) => setCalcTo(e.target.value as CurrencyCode)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs font-bold"
                >
                  <option value="USD">USD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="BWP">BWP</option>
                  <option value="ZMW">ZMW</option>
                </select>
              </div>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Converted Amount:</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {formatCurrency(calculatedResult, calcTo)}
              </span>
            </div>
          </div>

          {/* Admin Editable Rates Form */}
          {isAdmin ? (
            <form onSubmit={handleSaveRates} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Update Latest Firestore Rates
                </span>
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ZAR_USD</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={zarUsd}
                    onChange={(e) => setZarUsd(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">BWP_ZAR</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={bwpZar}
                    onChange={(e) => setBwpZar(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ZMW_ZAR</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={zmwZar}
                    onChange={(e) => setZmwZar(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-emerald-600/20"
                >
                  {saving ? 'Saving...' : 'Update Rates Document'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-slate-800/40 rounded-xl text-xs text-slate-400 text-center">
              Exchange rates are managed by Fleet Administration. Drivers have read-only access.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
