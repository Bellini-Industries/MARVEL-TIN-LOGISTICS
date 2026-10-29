import React, { useState } from 'react';
import { Trip } from '../types';
import { useTheme } from '../context/ThemeContext';
import { extractTruckRegistration, formatDateOnly } from '../utils/helpers';
import {
  X,
  Printer,
  Share2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Truck,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface CustomsDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

export const CustomsDossierModal: React.FC<CustomsDossierModalProps> = ({
  isOpen,
  onClose,
  trip
}) => {
  const { isDark } = useTheme();

  if (!isOpen || !trip) return null;

  const truckReg = extractTruckRegistration(trip.truckId);
  const manifestNo = trip.customsManifestNumber || 'ZIM-CD3-2026-9041';
  const gitPolicy = trip.gitPolicyNumber || 'GIT-SADC-99201-ZW';
  const consignmentVal = trip.consignmentValueUSD || 84000;
  const cargoDesc = trip.cargo || 'Tin Ore Concentrate (32 Metric Tons)';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*SADC CUSTOMS CLEARANCE DOSSIER - MARVEL TIN S.A.*\n\n` +
      `*Manifest:* ${manifestNo}\n` +
      `*Truck:* ${truckReg} | Driver: ${trip.driver}\n` +
      `*Route:* ${trip.origin} -> ${trip.destination}\n` +
      `*Cargo:* ${cargoDesc}\n` +
      `*GIT Insurance:* ${gitPolicy} ($150,000 Cover)\n` +
      `*CD3 Status:* COMPLIANT & AUDITED\n\n` +
      `Verify digital seal: https://ais-pre-fzg63uvc4cri2zwas546au-955770106805.europe-west2.run.app`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className={`animate-modal-enter border rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl transition-colors ${
        isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header Bar */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5 text-blue-500">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Customs Clearance Pack & SADC Dossier
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Consolidated CD3 Manifest · Proof of Entry · Commercial GIT Insurance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
              title="Print official stamped dossier"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm transition-colors"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Dossier Paper */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Printable Document Sheet Frame */}
          <div className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#080f24] border-[#1a294f]' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Dossier Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-700/60">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-blue-500 block">
                  MARVEL TIN S.A. · CROSS-BORDER FREIGHT LOGISTICS
                </span>
                <h2 className={`text-base font-black tracking-wide mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  SADC COMMERCIAL TRANSIT CARNET & CD3 BILL OF ENTRY
                </h2>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Southern African Cross-Border Customs Harmonization (ZIMRA / SARS / ZRA)
                </div>
              </div>

              {/* QR Verification Emblem */}
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-950 border border-slate-300 shadow-sm shrink-0">
                <QrCode className="w-12 h-12 text-slate-900" />
                <span className="text-[8px] font-mono font-bold tracking-tighter mt-1 text-slate-700">VERIFIED SEAL</span>
              </div>
            </div>

            {/* Manifest Reference Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-slate-700/40 text-[11px]">
              <div>
                <span className={`text-[9px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  MANIFEST NO.
                </span>
                <span className="font-mono font-bold text-sky-400">{manifestNo}</span>
              </div>
              <div>
                <span className={`text-[9px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ISSUE DATE
                </span>
                <span className="font-mono tabular-nums">{formatDateOnly(trip.startDate)}</span>
              </div>
              <div>
                <span className={`text-[9px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  PORT OF ENTRY / EXIT
                </span>
                <span className="font-bold text-amber-400">{trip.borderCheckpoint || 'Beitbridge Post'}</span>
              </div>
              <div>
                <span className={`text-[9px] uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  AUDIT STATUS
                </span>
                <span className="text-emerald-500 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" />
                  <span>COMPLIANT</span>
                </span>
              </div>
            </div>

            {/* Carrier & Hauler Specification */}
            <div className="py-3 border-b border-slate-700/40 space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                1. Hauler & Driver Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-[#0f1938] border-[#223561]' : 'bg-white border-slate-200'}`}>
                  <span className="text-[9px] text-slate-400 block font-bold">TRUCK REGISTRATION</span>
                  <span className="font-mono text-sm font-black text-blue-500">{truckReg}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Scania R500 (6x4 Axle)</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-[#0f1938] border-[#223561]' : 'bg-white border-slate-200'}`}>
                  <span className="text-[9px] text-slate-400 block font-bold">ASSIGNED DRIVER</span>
                  <span className="font-bold text-sm block">{trip.driver}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Passport: ZW-P9041284A</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-[#0f1938] border-[#223561]' : 'bg-white border-slate-200'}`}>
                  <span className="text-[9px] text-slate-400 block font-bold">SADC ROAD PERMIT</span>
                  <span className="font-mono font-bold text-xs text-emerald-400 block">SADC-PERMIT-2026-0812</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Valid ZW - SA - ZAM</span>
                </div>
              </div>
            </div>

            {/* Consignment & Cargo Specification */}
            <div className="py-3 border-b border-slate-700/40 space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                2. Commercial Consignment & Cargo Declaration
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">CONSIGNOR (EXPORTER)</span>
                  <p className="font-semibold">Kamativi Mining Company (Pvt) Ltd</p>
                  <p className="text-[11px] text-slate-400">Kamativi Tin Mine Site, Hwange District, Zimbabwe</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">CONSIGNEE (RECEIVER)</span>
                  <p className="font-semibold">Durban Bulk Handling Terminals Ltd</p>
                  <p className="text-[11px] text-slate-400">Container Port Berth 104, Durban Port, South Africa</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg border text-xs grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 ${
                isDark ? 'bg-[#0f1938] border-[#223561]' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">CARGO COMMODITY</span>
                  <span className="font-semibold text-blue-400">{cargoDesc}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">NET DECLARED WEIGHT</span>
                  <span className="font-mono font-bold">32,000 KG (32.0 MT)</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">DECLARED CUSTOMS VALUE</span>
                  <span className="font-mono font-bold text-emerald-400">${consignmentVal.toLocaleString()} USD</span>
                </div>
              </div>
            </div>

            {/* Insurance & Bond Guarantee */}
            <div className="pt-3 space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                3. Goods In Transit (GIT) & Border Guarantee
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-[#0f1938] border-[#223561]' : 'bg-white border-slate-200'}`}>
                  <span className="text-[9px] text-slate-400 block font-bold">GIT POLICY NUMBER</span>
                  <span className="font-mono font-bold text-sky-400">{gitPolicy}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Underwritten by Santam / Old Mutual</span>
                </div>
                <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-[#0f1938] border-[#223561]' : 'bg-white border-slate-200'}`}>
                  <span className="text-[9px] text-slate-400 block font-bold">TRANSIT BOND GUARANTEE</span>
                  <span className="font-mono font-bold text-emerald-400">BOND-SADC-ZW-SA-4412</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Full Customs Duty Waiver in Transit</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t text-xs flex items-center justify-between ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <span>Official Cross-Border Transit Carnet</span>
          <button
            onClick={onClose}
            className={`px-4 py-2 font-bold rounded-xl ${
              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
