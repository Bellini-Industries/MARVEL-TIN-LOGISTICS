import React from 'react';
import {
  Fuel,
  Receipt,
  Wallet,
  Truck,
  Wrench,
  Upload
} from 'lucide-react';

interface MobileFABProps {
  activeTab: string;
  onOpenFuel?: () => void;
  onOpenExpense?: () => void;
  onOpenPettyCash?: () => void;
  onOpenTrip?: () => void;
  onOpenMaintenance?: () => void;
  onOpenFile?: () => void;
}

export const MobileFAB: React.FC<MobileFABProps> = ({
  activeTab,
  onOpenFuel,
  onOpenExpense,
  onOpenPettyCash,
  onOpenTrip,
  onOpenMaintenance,
  onOpenFile
}) => {
  // 1. Fuel screen: solely Log Fuel Purchase
  if (activeTab === 'fuel' && onOpenFuel) {
    return (
      <div className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,16px))] right-4 z-[1700]">
        <button
          onClick={onOpenFuel}
          className="flex items-center space-x-2 px-4 py-3 bg-amber-500 text-slate-950 font-bold rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer border border-amber-400"
          aria-label="Log Diesel Fuel Purchase"
        >
          <Fuel className="w-4 h-4 text-slate-950" />
          <span className="text-xs">+ Log Fuel</span>
        </button>
      </div>
    );
  }

  // 2. Expenses screen: solely Record Route Expense
  if (activeTab === 'expenses' && onOpenExpense) {
    return (
      <div className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,16px))] right-4 z-[1700]">
        <button
          onClick={onOpenExpense}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer border border-blue-400"
          aria-label="Record Route Expense"
        >
          <Receipt className="w-4 h-4 text-white" />
          <span className="text-xs">+ Log Expense</span>
        </button>
      </div>
    );
  }

  // 3. Petty cash screen: solely Allocate Cash Float
  if (activeTab === 'petty_cash' && onOpenPettyCash) {
    return (
      <div className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,16px))] right-4 z-[1700]">
        <button
          onClick={onOpenPettyCash}
          className="flex items-center space-x-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer border border-emerald-400"
          aria-label="Allocate Cash Float"
        >
          <Wallet className="w-4 h-4 text-white" />
          <span className="text-xs">+ Add Float</span>
        </button>
      </div>
    );
  }

  // 4. Trips / Orders screen: solely Dispatch Trip
  if ((activeTab === 'trips' || activeTab === 'dashboard') && onOpenTrip) {
    return (
      <div className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,16px))] right-4 z-[1700]">
        <button
          onClick={onOpenTrip}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer border border-blue-400"
          aria-label="Dispatch New Trip"
        >
          <Truck className="w-4 h-4 text-white" />
          <span className="text-xs">+ New Order</span>
        </button>
      </div>
    );
  }

  // 5. Maintenance screen: solely Schedule Service
  if (activeTab === 'maintenance' && onOpenMaintenance) {
    return (
      <div className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,16px))] right-4 z-[1700]">
        <button
          onClick={onOpenMaintenance}
          className="flex items-center space-x-2 px-4 py-3 bg-purple-600 text-white font-bold rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer border border-purple-400"
          aria-label="Schedule Maintenance"
        >
          <Wrench className="w-4 h-4 text-white" />
          <span className="text-xs">+ Service</span>
        </button>
      </div>
    );
  }

  // 6. Files screen: solely Upload Document
  if (activeTab === 'files' && onOpenFile) {
    return (
      <div className="md:hidden fixed bottom-[calc(68px+env(safe-area-inset-bottom,16px))] right-4 z-[1700]">
        <button
          onClick={onOpenFile}
          className="flex items-center space-x-2 px-4 py-3 bg-teal-600 text-white font-bold rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer border border-teal-400"
          aria-label="Upload Document"
        >
          <Upload className="w-4 h-4 text-white" />
          <span className="text-xs">+ Upload</span>
        </button>
      </div>
    );
  }

  // Purely informational/auditing screens (Accounting, Reports, Profitability, Borders)
  // are completely decluttered with no floating action button overlay
  return null;
};
