import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Expense, FuelLog, AuditStatus, CurrencyCode, Trip } from '../types';
import {
  formatCurrency,
  convertToUSD,
  formatDateOnly,
  formatDateTime,
  extractTruckRegistration
} from '../utils/helpers';
import {
  Search,
  Plus,
  Edit,
  FileText,
  Copy,
  Archive,
  Ban,
  Send,
  DollarSign,
  Filter,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Printer,
  Download,
  Eye,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Scale,
  Truck,
  MapPin,
  Phone,
  MessageSquare,
  Radio,
  Layers,
  RefreshCw,
  X,
  Building,
  Receipt,
  FileSpreadsheet,
  Check,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ClipboardList,
  Sliders,
  Flag,
  Share2
} from 'lucide-react';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import { TaxInvoiceModal } from './TaxInvoiceModal';
import { LightAccountingDashboard } from './LightAccountingDashboard';

interface AccountingDashboardViewProps {
  onOpenPettyCashModal?: (truckId?: string) => void;
  onOpenTripModal?: () => void;
}

// Enterprise TMS Load Record Interface
interface TMSLoadRow {
  id: string;
  loadId: string;
  status: 'At Drop' | 'In Transit' | 'Dispatched' | 'Ready for Accounting' | 'Invoiced' | 'Planning';
  reference: string;
  lastContact: {
    time: string;
    type: 'AscendTracker' | 'Check Call' | 'Text Message';
    person: string;
    note: string;
    severity?: 'info' | 'success' | 'warning' | 'alert';
  };
  customer: string;
  picks: string;
  pickDate: string;
  drops: string;
  dropDate: string;
  usersAndRoles: string;
  carrierUnit: string;
  trailer: string;
  distanceKm: number;
  weightTons: number;
  incomeUSD: number;
  expensesUSD: number;
  truckStatus: 'On Time' | 'Empty' | 'At Pickup' | 'At Drop' | 'Delayed';
  rawTrip?: Trip;
}

export const AccountingDashboardView: React.FC<AccountingDashboardViewProps> = ({
  onOpenPettyCashModal,
  onOpenTripModal
}) => {
  const {
    trips,
    expenses,
    fuelLogs,
    pettyCash,
    exchangeRates,
    updateExchangeRates,
    calculatePettyCashBalance
  } = useFleet();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Mode: Light Mode Modern Accounting Dashboard (default) vs TMS Freight Load Ledger
  const [dashboardViewMode, setDashboardViewMode] = useState<'light_dashboard' | 'tms_ledger'>('light_dashboard');

  // Top Nav Tab Filter matching AscendTMS Screenshot
  const [activeTab, setActiveTab] = useState<
    'active' | 'planning' | 'accounting_ready' | 'all' | 'cross_border' | 'audit_queue' | 'subsistence' | 'debtors'
  >('active');

  // Load Status Dropdown Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);

  // Shortcuts Context Popover State
  const [selectedLoadForShortcuts, setSelectedLoadForShortcuts] = useState<TMSLoadRow | null>(null);

  // Invoice Studio Modal State
  const [selectedTripForInvoice, setSelectedTripForInvoice] = useState<Trip | null>(null);

  // Receipt Modal State
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [receiptModalTitle, setReceiptModalTitle] = useState('Receipt Slip');

  // Audit Tab Filters & Overrides
  const [auditFilter, setAuditFilter] = useState<'all' | 'pending' | 'verified' | 'flagged'>('pending');
  const [auditOverrides, setAuditOverrides] = useState<Record<string, AuditStatus>>({});
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Exchange rate editing
  const [editingRates, setEditingRates] = useState(false);
  const [tempZarUsd, setTempZarUsd] = useState(String(exchangeRates?.ZAR_USD || 0.0545));
  const [tempBwpZar, setTempBwpZar] = useState(String(exchangeRates?.BWP_ZAR || 1.35));

  // Base list of rich TMS loads derived from fleet context + standard commercial corridor rows
  const allTMSLoads: TMSLoadRow[] = useMemo(() => {
    // 1. Transform trips from fleet context
    const fromTrips: TMSLoadRow[] = trips.map((trip, idx) => {
      const rev = trip.revenueUSD || (typeof trip.agreedRate === 'object' ? trip.agreedRate?.rate * (trip.weightTons || 32) : 4850);
      const tripFuel = fuelLogs
        .filter((f) => f.tripId === trip.id)
        .reduce((sum, f) => sum + convertToUSD(f.cost, f.currency, exchangeRates), 0) || 680;
      const tripExp = expenses
        .filter((e) => e.tripId === trip.id)
        .reduce((sum, e) => sum + convertToUSD(e.amount, e.currency, exchangeRates), 0) || 310;
      const totalExp = tripFuel + tripExp + 250;

      const isDelivered = trip.status === 'completed' || !!trip.deliveryPod?.receiverSignature;
      const hasDelays = Boolean(trip.delaysAndIncidents && trip.delaysAndIncidents.length > 0);
      const status: TMSLoadRow['status'] = isDelivered
        ? (trip.invoice?.status === 'sent' ? 'Invoiced' : 'Ready for Accounting')
        : hasDelays
        ? 'At Drop'
        : trip.status === 'in_progress'
        ? 'In Transit'
        : 'Dispatched';

      return {
        id: trip.id,
        loadId: String(1970 + idx),
        status,
        reference: trip.tripReferenceNumber || trip.customerPoNumber || `PO500${147 + idx}`,
        lastContact: {
          time: '02/25 10:24',
          type: 'AscendTracker',
          person: trip.driver || 'Gary',
          note: trip.collectionLog?.discrepancyNotes || 'Checked in. Loading underway.',
          severity: hasDelays ? 'warning' : 'info'
        },
        customer: trip.customerName || 'African Mineral Logistics',
        picks: `1. ${trip.origin?.split('/')[0] || 'Kamativi Depot'}`,
        pickDate: formatDateOnly(trip.startDate) || '02/17/2026 06:00',
        drops: `2. ${trip.destination?.split('/')[0] || 'Durban Port'}`,
        dropDate: formatDateOnly(trip.endDate) || '02/20/2026 14:00',
        usersAndRoles: `Nomsa Dlamini: Controller • Hunter Parrish: Dispatcher • ${trip.driver}: Driver`,
        carrierUnit: extractTruckRegistration(trip.truckId),
        trailer: '13.6m Flatbed (T5311)',
        distanceKm: trip.totalKm || 1680,
        weightTons: trip.weightTons || 32.4,
        incomeUSD: rev,
        expensesUSD: totalExp,
        truckStatus: hasDelays ? 'Delayed' : isDelivered ? 'At Drop' : 'On Time',
        rawTrip: trip
      };
    });

    // 2. Extra authentic loads matching screenshot format if needed for high enterprise density
    const defaultEnterpriseRows: TMSLoadRow[] = [
      {
        id: 'load-demo-1924',
        loadId: '1924',
        status: 'At Drop',
        reference: 'PUB1775004',
        lastContact: {
          time: '02/25 10:24',
          type: 'AscendTracker',
          person: 'Gary',
          note: 'At pick/drop. Receiver inspecting seal integrity.',
          severity: 'info'
        },
        customer: 'Publix Super Markets (Pty) Ltd',
        picks: '1. Pomona Freight Depot, JHB',
        pickDate: '02/17/2026 06:00',
        drops: '2. Cape Town Distribution Center',
        dropDate: '02/18/2026 10:00',
        usersAndRoles: 'Hunter Parrish: Dispatcher • Nomsa: Controller',
        carrierUnit: 'JRB 216MP',
        trailer: 'Tri-Axle Curtain (R1670)',
        distanceKm: 1420,
        weightTons: 36.0,
        incomeUSD: 3147.20,
        expensesUSD: 2350.00,
        truckStatus: 'At Drop'
      },
      {
        id: 'load-demo-1934',
        loadId: '1934',
        status: 'In Transit',
        reference: 'PO500147',
        lastContact: {
          time: '02/25 10:15',
          type: 'Check Call',
          person: 'Tichaona',
          note: 'On time. Passing Polokwane N1 Northbound.',
          severity: 'info'
        },
        customer: 'Bluth Mineral Holdings',
        picks: '1. Beitbridge Clearing Terminal',
        pickDate: '02/17/2026 20:00',
        drops: '2. Pomona Bonded Yard, JHB',
        dropDate: '02/21/2026 05:00',
        usersAndRoles: 'Randy Goldizen: Customer Sales • Nicolas Jackson: Dispatcher',
        carrierUnit: 'KBR 813MP',
        trailer: '13.6m Flatbed (T5311)',
        distanceKm: 980,
        weightTons: 34.0,
        incomeUSD: 3603.50,
        expensesUSD: 2750.25,
        truckStatus: 'On Time'
      },
      {
        id: 'load-demo-1953',
        loadId: '1953',
        status: 'In Transit',
        reference: 'LPOL321744',
        lastContact: {
          time: '02/25 10:16',
          type: 'Check Call',
          person: 'Anthony',
          note: 'Checked in. Speed 78 km/h on N3 corridor.',
          severity: 'info'
        },
        customer: 'Los Pollos Mining Ltd',
        picks: '1. Kolwezi Mine Gate 2, DRC',
        pickDate: '02/17/2026 10:00',
        drops: '2. Durban Pier 2 Terminal',
        dropDate: '02/20/2026 05:00',
        usersAndRoles: 'Randy Goldizen: Sales • Nomsa Dlamini: Accountant',
        carrierUnit: 'JRB 216MP',
        trailer: 'Tri-Axle Container Sump',
        distanceKm: 2600,
        weightTons: 45.0,
        incomeUSD: 4230.38,
        expensesUSD: 2202.25,
        truckStatus: 'On Time'
      },
      {
        id: 'load-demo-1968',
        loadId: '1968',
        status: 'Ready for Accounting',
        reference: 'BC0897',
        lastContact: {
          time: '02/25 10:41',
          type: 'Text Message',
          person: 'Edgar',
          note: 'Checked in. Offloaded and signed POD on file.',
          severity: 'success'
        },
        customer: 'Glencore DRC Operations',
        picks: '1. Lubumbashi Smelter',
        pickDate: '02/14/2026 08:00',
        drops: '2. Richards Bay Bulk Terminal',
        dropDate: '02/18/2026 08:00',
        usersAndRoles: 'Randy Goldizen: Sales • Nicolas Jackson: Dispatcher',
        carrierUnit: 'KBR 813MP',
        trailer: '13.6m Flatbed',
        distanceKm: 1850,
        weightTons: 32.0,
        incomeUSD: 3850.00,
        expensesUSD: 2450.00,
        truckStatus: 'At Drop'
      },
      {
        id: 'load-demo-1999',
        loadId: '1999',
        status: 'Dispatched',
        reference: 'PO500149',
        lastContact: {
          time: '02/25 12:28',
          type: 'Check Call',
          person: 'Dispatch',
          note: 'On time. Waybill documentation released.',
          severity: 'info'
        },
        customer: 'Dunder Mifflin Paper & Logistics',
        picks: '1. Springs Paper Mill, Gauteng',
        pickDate: '02/05/2026 20:00',
        drops: '2. Gaborone Distribution Center',
        dropDate: '02/06/2026 05:00',
        usersAndRoles: 'Randy Goldizen: Customer Sales • Marina Granovskaia: Carrier Sales',
        carrierUnit: 'JRB 216MP',
        trailer: 'Enclosed Tautliner',
        distanceKm: 420,
        weightTons: 28.0,
        incomeUSD: 1650.00,
        expensesUSD: 980.00,
        truckStatus: 'On Time'
      },
      {
        id: 'load-demo-2071',
        loadId: '2071',
        status: 'In Transit',
        reference: 'PUB1774122',
        lastContact: {
          time: '02/25 10:21',
          type: 'Text Message',
          person: 'Gary',
          note: '10-4. Will call ahead at weighbridge.',
          severity: 'info'
        },
        customer: 'Barloworld Transport SA',
        picks: '1. Alrode Freight Yard',
        pickDate: '02/04/2026 06:00',
        drops: '2. Durban Point Container Bay',
        dropDate: '02/05/2026 11:00',
        usersAndRoles: 'Randy Goldizen: Customer Sales • Nicolas Jackson: Dispatcher',
        carrierUnit: 'KBR 813MP',
        trailer: '13.6m Flatbed (T5311)',
        distanceKm: 580,
        weightTons: 31.0,
        incomeUSD: 2180.00,
        expensesUSD: 1450.00,
        truckStatus: 'On Time'
      }
    ];

    // Combine avoiding duplicate IDs
    const combined = [...fromTrips];
    for (const d of defaultEnterpriseRows) {
      if (!combined.some((c) => c.loadId === d.loadId)) {
        combined.push(d);
      }
    }
    return combined;
  }, [trips, fuelLogs, expenses, exchangeRates]);

  // Filtered Loads for Active Tab
  const filteredLoads = useMemo(() => {
    return allTMSLoads.filter((load) => {
      // 1. Tab filter
      if (activeTab === 'active') {
        if (load.status === 'Invoiced') return false;
      } else if (activeTab === 'planning') {
        if (load.status !== 'Planning' && load.status !== 'Dispatched') return false;
      } else if (activeTab === 'accounting_ready') {
        if (load.status !== 'Ready for Accounting' && load.status !== 'Invoiced') return false;
      } else if (activeTab === 'cross_border') {
        if (!load.picks.includes('DRC') && !load.picks.includes('Beitbridge') && !load.picks.includes('Kamativi')) return false;
      }

      // 2. Status dropdown filter
      if (statusFilter !== 'all' && load.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          load.loadId.toLowerCase().includes(q) ||
          load.reference.toLowerCase().includes(q) ||
          load.customer.toLowerCase().includes(q) ||
          load.carrierUnit.toLowerCase().includes(q) ||
          load.picks.toLowerCase().includes(q) ||
          load.drops.toLowerCase().includes(q) ||
          load.lastContact.note.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allTMSLoads, activeTab, statusFilter, searchQuery]);

  // Financial Totals of Table Above (matching bottom-right box in screenshot)
  const financialSummary = useMemo(() => {
    const totalIncome = filteredLoads.reduce((sum, r) => sum + r.incomeUSD, 0);
    const totalExp = filteredLoads.reduce((sum, r) => sum + r.expensesUSD, 0);
    const grossProfit = totalIncome - totalExp;
    const profitMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExp,
      grossProfit,
      profitMargin
    };
  }, [filteredLoads]);

  // Audit Queue Items for Tab 3
  const auditQueueItems = useMemo(() => {
    const fuelItems = fuelLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      type: 'fuel' as const,
      truck: extractTruckRegistration(log.truckId),
      description: `${log.litres}L Diesel (${log.odometerReadingKm?.toLocaleString() || '---'} km)`,
      amountOriginal: log.cost,
      currency: log.currency,
      amountUSD: convertToUSD(log.cost, log.currency, exchangeRates),
      receiptUrl: log.receiptUrl,
      status: auditOverrides[log.id] || log.auditStatus || 'pending'
    }));

    const expenseItems = expenses.map((exp) => ({
      id: exp.id,
      timestamp: exp.timestamp,
      type: 'expense' as const,
      truck: extractTruckRegistration(exp.truckId),
      description: `${exp.category.toUpperCase()}: ${exp.description}`,
      amountOriginal: exp.amount,
      currency: exp.currency,
      amountUSD: convertToUSD(exp.amount, exp.currency, exchangeRates),
      receiptUrl: exp.receiptUrl,
      status: auditOverrides[exp.id] || exp.auditStatus || 'pending'
    }));

    const all = [...fuelItems, ...expenseItems];
    if (auditFilter === 'all') return all;
    return all.filter((item) => item.status === auditFilter);
  }, [fuelLogs, expenses, exchangeRates, auditOverrides, auditFilter]);

  const handleSetAuditStatus = (id: string, status: AuditStatus) => {
    setAuditOverrides((prev) => ({ ...prev, [id]: status }));
  };

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  };

  if (dashboardViewMode === 'light_dashboard') {
    return (
      <LightAccountingDashboard
        onOpenTripModal={onOpenTripModal}
        onOpenPettyCashModal={onOpenPettyCashModal}
        onSwitchToTmsView={() => setDashboardViewMode('tms_ledger')}
      />
    );
  }

  return (
    <div className={`space-y-3 font-sans transition-colors ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Toast feedback */}
      {actionToast && (
        <div className="fixed top-4 right-4 z-[3000] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* =========================================================================
          TMS TOP BREADCRUMB & HEADER TITLE BAR (AscendTMS Style)
         ========================================================================= */}
      <div className={`rounded-xl border p-3 sm:p-4 transition-colors ${
        isDark ? 'bg-[#0B132B] border-[#18264A]' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 text-xs border-b border-slate-700/20">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
            <span>Home</span>
            <span>&gt;</span>
            <span className="font-semibold text-sky-400">Loads & Financial Controller</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Branch: <strong>Southern Africa Freight Corridor</strong></span>
            </span>
            <span>•</span>
            <span>User: <strong>Nomsa Dlamini (Controller)</strong></span>
          </div>
        </div>

        {/* Title Block with TMS Icon & Switch to Light Dashboard */}
        <div className="pt-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h1 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Load Management
              </h1>
              <p className="text-[11px] text-slate-400">
                Enterprise Freight Control, Dispatch Tracking & SARS Section 20 Accounting Pipeline
              </p>
            </div>
          </div>

          {/* Quick Stats & Switch to Modern Light Dashboard Button */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <button
              onClick={() => setDashboardViewMode('light_dashboard')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer transition-all active:scale-95 font-sans"
            >
              <span>Quixy Accounting Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="hidden md:inline px-2.5 py-1 rounded-md bg-blue-500/10 text-sky-400 border border-blue-500/25">
              Active Loads: <strong>{filteredLoads.length}</strong>
            </span>
            <span className="hidden md:inline px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              Net Profit: <strong>${financialSummary.grossProfit.toFixed(0)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ASCEND-TMS HORIZONTAL NAVIGATION TABS (Matching Screenshot)
         ========================================================================= */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs font-semibold select-none border-b border-slate-700/30">
        {[
          { key: 'active', label: 'Active Loads', badge: allTMSLoads.filter(l => l.status !== 'Invoiced').length },
          { key: 'planning', label: 'Planning Loads', badge: allTMSLoads.filter(l => l.status === 'Planning' || l.status === 'Dispatched').length },
          { key: 'accounting_ready', label: 'Ready for Accounting Loads', badge: allTMSLoads.filter(l => l.status === 'Ready for Accounting').length, highlight: true },
          { key: 'cross_border', label: 'Cross-Border Corridor', badge: allTMSLoads.filter(l => l.picks.includes('DRC') || l.picks.includes('Beitbridge') || l.picks.includes('Kamativi')).length },
          { key: 'all', label: 'All Loads', badge: allTMSLoads.length },
          { key: 'audit_queue', label: 'Audit Queue (Rule 1)', badge: auditQueueItems.filter(i => i.status === 'pending').length, alert: true },
          { key: 'subsistence', label: 'Driver Subsistence & PAYE' },
          { key: 'debtors', label: 'Debtors Aging' }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-t-lg transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 border-t border-x ${
                isActive
                  ? isDark
                    ? 'bg-[#111C3A] border-[#223668] text-white border-b-transparent shadow-xs font-bold'
                    : 'bg-white border-slate-300 text-blue-600 border-b-transparent shadow-xs font-bold'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0E1730]'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  tab.highlight
                    ? 'bg-purple-600 text-white font-bold'
                    : tab.alert
                    ? 'bg-rose-600 text-white font-bold'
                    : isDark
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          TMS TOOLBAR WITH ACTION BUTTONS (Matching Screenshot)
         ========================================================================= */}
      <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
        isDark ? 'bg-[#0E1733] border-[#1C2C55]' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* + Tax Invoice / Audit */}
          <button
            onClick={() => {
              if (filteredLoads[0]?.rawTrip) {
                setSelectedTripForInvoice(filteredLoads[0].rawTrip);
              } else if (trips.length > 0) {
                setSelectedTripForInvoice(trips[0]);
              }
            }}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1 shadow-xs cursor-pointer transition-colors"
            title="Open official Tax Invoice & Audit Console"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Tax Invoice / Audit</span>
          </button>

          {/* Post Loads */}
          <button
            onClick={() => showToast('Load dispatched to regional freight boards.')}
            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
              isDark ? 'bg-[#131F42] border-[#203362] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Post Loads
          </button>

          {/* Edit Load */}
          <button
            onClick={() => {
              if (filteredLoads[0]?.rawTrip) {
                setSelectedTripForInvoice(filteredLoads[0].rawTrip);
              } else if (trips.length > 0) {
                setSelectedTripForInvoice(trips[0]);
              } else {
                showToast('Select a load from the register to audit or edit invoice details.');
              }
            }}
            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
              isDark ? 'bg-[#131F42] border-[#203362] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Edit Load
          </button>

          {/* Load Documents */}
          <button
            onClick={() => {
              const withPod = filteredLoads.find((l) => l.rawTrip?.deliveryPod?.companyStampPhotoUrl);
              if (withPod?.rawTrip?.deliveryPod?.companyStampPhotoUrl) {
                setSelectedReceiptUrl(withPod.rawTrip.deliveryPod.companyStampPhotoUrl);
                setReceiptModalTitle(`Load #${withPod.loadId} - Stamped POD Waybill`);
              } else {
                showToast('Viewing verified electronic consignment waybills.');
              }
            }}
            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
              isDark ? 'bg-[#131F42] border-[#203362] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Load Documents
          </button>

          {/* Copy Load */}
          <button
            onClick={() => showToast('Load cloned into planning buffer.')}
            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
              isDark ? 'bg-[#131F42] border-[#203362] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Copy Load
          </button>

          {/* Send to Accounting / Open Invoice Studio */}
          <button
            onClick={() => setSelectedTripForInvoice(filteredLoads[0]?.rawTrip || trips[0] || null)}
            className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-xs cursor-pointer transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Send to Accounting</span>
          </button>
        </div>

        {/* Right Status Filter Dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Filtered Load Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-md px-2.5 py-1 border text-xs font-semibold focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-[#131F42] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">Active Loads (All)</option>
            <option value="at drop">At Drop</option>
            <option value="in transit">In Transit</option>
            <option value="dispatched">Dispatched</option>
            <option value="ready for accounting">Ready for Accounting</option>
            <option value="invoiced">Invoiced</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          TAB CONTENT: 1. ACTIVE / PLANNING / ACCOUNTING LOADS TABLE
         ========================================================================= */}
      {(activeTab === 'active' || activeTab === 'planning' || activeTab === 'accounting_ready' || activeTab === 'all' || activeTab === 'cross_border') && (
        <div className={`rounded-xl border overflow-hidden ${
          isDark ? 'bg-[#091124] border-[#18264A]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Search Loads On This Tab Bar */}
          <div className={`p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? 'border-[#18264A] bg-[#0C152E]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                Search Loads on this Tab:
              </span>
              <div className="relative w-full">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Load ID, Reference, Customer, City, Unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full rounded-md pl-8 pr-3 py-1.5 text-xs border focus:outline-none focus:border-blue-500 ${
                    isDark ? 'bg-[#111C3A] border-[#1E2E56] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <div className="flex items-center space-x-1">
                <span>Show</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                  className={`rounded px-1.5 py-1 text-xs border ${
                    isDark ? 'bg-[#111C3A] border-[#1E2E56] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
              </div>
            </div>
          </div>

          {/* Enterprise AscendTMS Dense Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`border-b text-[10px] uppercase font-bold tracking-wider select-none ${
                isDark ? 'bg-[#070D1E] border-[#152345] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <tr>
                  <th className="px-3 py-2.5 text-center">Load Status ⇅</th>
                  <th className="px-3 py-2.5">Load ID ⇅</th>
                  <th className="px-3 py-2.5">Reference ⇅</th>
                  <th className="px-3 py-2.5">Last Contact / Tracking</th>
                  <th className="px-3 py-2.5">Customer ⇅</th>
                  <th className="px-3 py-2.5">Picks</th>
                  <th className="px-3 py-2.5">Pick Date ⇅</th>
                  <th className="px-3 py-2.5">Drops</th>
                  <th className="px-3 py-2.5">Drop Date ⇅</th>
                  <th className="px-3 py-2.5">Carrier Unit</th>
                  <th className="px-3 py-2.5">Trailer</th>
                  <th className="px-3 py-2.5 text-right">Distance</th>
                  <th className="px-3 py-2.5 text-right">Weight</th>
                  <th className="px-3 py-2.5 text-right font-mono">Income</th>
                  <th className="px-3 py-2.5 text-right font-mono">Expenses</th>
                  <th className="px-3 py-2.5 text-center">Truck Status</th>
                  <th className="px-3 py-2.5 text-right font-mono">Gross Profit</th>
                  <th className="px-3 py-2.5 text-right font-mono">%</th>
                  <th className="px-2 py-2.5 text-center">Shortcuts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-xs font-medium">
                {filteredLoads.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="px-4 py-12 text-center text-slate-400">
                      No loads found matching search query or status filter.
                    </td>
                  </tr>
                ) : (
                  filteredLoads.slice(0, entriesPerPage).map((row) => {
                    const grossProfit = row.incomeUSD - row.expensesUSD;
                    const marginPct = row.incomeUSD > 0 ? (grossProfit / row.incomeUSD) * 100 : 0;

                    // Authentic AscendTMS status styling
                    const statusBadgeClass =
                      row.status === 'At Drop'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : row.status === 'In Transit'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : row.status === 'Ready for Accounting'
                        ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                        : row.status === 'Invoiced'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-sky-100 text-sky-900 border-sky-300';

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-[#0E1838]' : 'hover:bg-blue-50/50'
                        }`}
                        onClick={() => setSelectedLoadForShortcuts(row)}
                      >
                        {/* Load Status */}
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${statusBadgeClass}`}>
                            {row.status}
                          </span>
                        </td>

                        {/* Load ID */}
                        <td className="px-3 py-2 font-mono font-bold text-blue-500">
                          {row.loadId}
                        </td>

                        {/* Reference Number */}
                        <td className="px-3 py-2 font-mono text-slate-300 font-semibold hover:underline">
                          {row.reference}
                        </td>

                        {/* Last Contact / Tracking */}
                        <td className="px-3 py-2 max-w-xs truncate">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-[10px] text-slate-400 font-mono">{row.lastContact.time}:</span>
                            <span className="text-slate-200 truncate">{row.lastContact.note}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-2 font-bold text-slate-200">
                          {row.customer}
                        </td>

                        {/* Picks & Pick Date */}
                        <td className="px-3 py-2 text-slate-300 text-[11px] truncate max-w-[130px]">
                          {row.picks}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                          {row.pickDate}
                        </td>

                        {/* Drops & Drop Date */}
                        <td className="px-3 py-2 text-slate-300 text-[11px] truncate max-w-[130px]">
                          {row.drops}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                          {row.dropDate}
                        </td>

                        {/* Carrier Unit & Trailer */}
                        <td className="px-3 py-2 font-bold text-sky-400 font-mono">
                          {row.carrierUnit}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {row.trailer}
                        </td>

                        {/* Distance & Weight */}
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          {row.distanceKm.toLocaleString()} km
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          {row.weightTons} T
                        </td>

                        {/* Income & Expenses */}
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-200">
                          ${row.incomeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400">
                          ${row.expensesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Truck Status */}
                        <td className="px-3 py-2 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {row.truckStatus}
                          </span>
                        </td>

                        {/* Gross Profit / Loss */}
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                          ${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Gross Profit % */}
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          {marginPct.toFixed(2)}%
                        </td>

                        {/* Shortcuts Trigger Button */}
                        <td className="px-2 py-2 text-center" onClick={(e) => { e.stopPropagation(); setSelectedLoadForShortcuts(row); }}>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white cursor-pointer"
                            title="Open Load Shortcuts"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Footer: Pagination Left + Floating Financial Summary Right */}
          <div className={`p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark ? 'border-[#18264A] bg-[#0C152E]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="text-xs text-slate-400 font-mono">
              Showing 1 to {Math.min(entriesPerPage, filteredLoads.length)} of {filteredLoads.length} entries
            </div>

            {/* AscendTMS Exact Bottom-Right Financial Summary Box */}
            <div className={`rounded-lg border p-3 min-w-[280px] shadow-sm font-mono text-xs ${
              isDark ? 'bg-[#101C3D] border-[#223668] text-slate-200' : 'bg-amber-50/60 border-amber-200/80 text-slate-900'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-center border-b border-slate-700/30 pb-1">
                Financial summary of table above
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Income:</span>
                  <span className="font-bold text-slate-200">
                    $ {financialSummary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Expenditures:</span>
                  <span className="font-bold text-rose-400">
                    $ {financialSummary.totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700/40 text-emerald-400 font-black">
                  <span>Gross Profit/Loss:</span>
                  <span>
                    $ {financialSummary.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB CONTENT: 2. RECEIPT AUDIT QUEUE (RULE 1 ENFORCEMENT)
         ========================================================================= */}
      {activeTab === 'audit_queue' && (
        <div className={`rounded-xl border overflow-hidden ${
          isDark ? 'bg-[#091124] border-[#18264A]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Rule 1 Notice Banner */}
          <div className="p-3 bg-rose-600/15 border-b border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
              <span>RULE 1 ENFORCED: Every expense needs a photo of the receipt — no photo, no reimbursement.</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">Reconcile pump slips to fuel card statement</span>
          </div>

          <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? 'border-[#18264A] bg-[#0C152E]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div>
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-sky-400" />
                <h2 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Receipt & Voucher Audit Queue
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Controller verification for all diesel pump slips, toll gate tickets, and cross-border transit permits.
              </p>
            </div>

            {/* Audit Status Filter Tabs */}
            <div className={`flex items-center rounded-xl p-1 text-xs border ${
              isDark ? 'bg-[#111C3A] border-[#1E2E56]' : 'bg-slate-200 border-slate-300'
            }`}>
              {(['all', 'pending', 'verified', 'flagged'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setAuditFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    auditFilter === filterKey
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                isDark ? 'bg-[#070D1E] border-[#152345] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Truck</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount (Orig)</th>
                  <th className="px-4 py-3 text-right">USD Equiv</th>
                  <th className="px-4 py-3 text-center">Receipt Slip</th>
                  <th className="px-4 py-3 text-center">Audit Status</th>
                  <th className="px-4 py-3 text-right">Controller Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-medium">
                {auditQueueItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No entries matching filter "{auditFilter}".
                    </td>
                  </tr>
                ) : (
                  auditQueueItems.map((item) => (
                    <tr key={item.id} className={isDark ? 'hover:bg-[#0D1836]/60' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDateOnly(item.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">
                        {item.truck}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          item.type === 'fuel' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 max-w-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        {formatCurrency(item.amountOriginal, item.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-400 whitespace-nowrap">
                        ${item.amountUSD.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.receiptUrl ? (
                          <button
                            onClick={() => {
                              setSelectedReceiptUrl(item.receiptUrl);
                              setReceiptModalTitle(`${item.truck} - ${item.description}`);
                            }}
                            className="px-2 py-1 rounded-md bg-blue-500/15 text-sky-400 hover:bg-blue-500/25 font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Slip</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-bold italic">No slip (Rejected)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          item.status === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'flagged'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleSetAuditStatus(item.id, 'verified')}
                            title="Verify and Approve"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              item.status === 'verified' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSetAuditStatus(item.id, 'flagged')}
                            title="Flag Discrepancy"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              item.status === 'flagged' ? 'bg-rose-600 text-white' : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                            }`}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB CONTENT: 3. DRIVER SUBSISTENCE (SARS STATUTORY CAPS)
         ========================================================================= */}
      {activeTab === 'subsistence' && (
        <div className={`p-5 rounded-xl border space-y-4 ${
          isDark ? 'bg-[#091124] border-[#18264A]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
            <div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Driver Subsistence & SARS Prescribed Allowance Thresholds
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Amounts paid up to the SARS prescribed rate are tax-free; excess is subject to PAYE withholding under 4th Schedule.
              </p>
            </div>
            <div className="text-right text-xs font-mono">
              <span className="text-[10px] text-slate-400 block">SARS Prescribed Daily Rates (Current Tax Year)</span>
              <span className="font-bold text-sky-400">SA Domestic: R522/day • Cross-Border: USD $130/day</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-sm text-white">Driver: Tichaona Ndlovu</h4>
                  <p className="text-xs text-slate-400 font-mono">Truck JRB 216MP • Harare → Durban (5 Nights Out)</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  100% Tax-Free
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subsistence Paid:</span>
                  <span className="font-bold text-white">$110 / day × 5 days = $550.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SARS Prescribed Cap:</span>
                  <span className="text-slate-300">$130 / day × 5 days = $650.00</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700/50">
                  <span className="text-emerald-400 font-bold">Non-Taxable Portion:</span>
                  <span className="text-emerald-400 font-black">$550.00 (Exempt)</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-sm text-white">Driver: Anthony Mthembu</h4>
                  <p className="text-xs text-slate-400 font-mono">Truck KBR 813MP • JHB → Chirundu (6 Nights Out)</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-xs">
                  PAYE Split Required
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subsistence Paid:</span>
                  <span className="font-bold text-white">R650 / day × 6 days = R3,900.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SARS Prescribed Cap:</span>
                  <span className="text-slate-300">R522 / day × 6 days = R3,132.00</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700/50">
                  <span className="text-amber-400 font-bold">Taxable for PAYE:</span>
                  <span className="text-amber-400 font-black">R768.00 (Remit to SARS)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB CONTENT: 4. DEBTORS AGE ANALYSIS & AGING LEDGER
         ========================================================================= */}
      {activeTab === 'debtors' && (
        <div className={`p-5 rounded-xl border space-y-4 ${
          isDark ? 'bg-[#091124] border-[#18264A]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
            <div>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Accounts Receivable Debtors Age Analysis & Forex Exposure
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Outstanding balances tied to signed POD waybills. Monitor ZAR/USD currency fluctuations.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Total Outstanding: $11,850.00
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-400 text-[10px] block">Current (0-30 Days)</span>
              <span className="font-bold text-base text-emerald-400">$6,850.00</span>
            </div>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-400 text-[10px] block">31 - 60 Days</span>
              <span className="font-bold text-base text-sky-400">$3,200.00</span>
            </div>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-400 text-[10px] block">61 - 90 Days</span>
              <span className="font-bold text-base text-amber-400">$1,800.00</span>
            </div>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-400 text-[10px] block">90+ Days (Overdue)</span>
              <span className="font-bold text-base text-rose-400">$0.00</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE CONTEXT MENU / POPOVER: "Load #XXXX Shortcuts" (Matching Screenshot)
         ========================================================================= */}
      {selectedLoadForShortcuts && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-xl shadow-2xl border overflow-hidden select-none animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-[#0E1733] border-[#223668] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header with Title & Close Icon */}
            <div className={`px-4 py-2.5 border-b flex items-center justify-between font-bold text-xs ${
              isDark ? 'bg-[#121E42] border-[#203362] text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Load #{selectedLoadForShortcuts.loadId} Shortcuts</span>
              </div>
              <button
                onClick={() => setSelectedLoadForShortcuts(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items matching AscendTMS Screenshot */}
            <div className="p-2 space-y-0.5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Group 1: Core Load Actions */}
              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  if (selectedLoadForShortcuts.rawTrip) {
                    setSelectedTripForInvoice(selectedLoadForShortcuts.rawTrip);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <Edit className="w-3.5 h-3.5 text-blue-400" />
                <span>Edit Load</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  setSelectedTripForInvoice(selectedLoadForShortcuts.rawTrip || trips[0]);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer font-bold ${
                  isDark ? 'hover:bg-[#16244E] text-emerald-400 hover:text-emerald-300' : 'hover:bg-slate-100 text-emerald-700'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>$ Send to Accounting / Open Tax Invoice</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Status updated for Load #${selectedLoadForShortcuts.loadId}`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Change Load Status</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Displaying digital consignment waybills & POD stamp.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>View or Send Load Docs</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Document upload request dispatched to driver.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Request Documents From Driver</span>
              </button>

              <div className="border-t border-slate-700/30 my-1" />

              {/* Group 2: Tracking & Check Calls */}
              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Live GPS Beacon ping requested from truck ${selectedLoadForShortcuts.carrierUnit}`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send Single AscendTracker Message</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Dispatch telemetry linked for corridor tracking.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Dispatch and Tracking</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Check call logged: Vehicle on-time at checkpoint.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Log Check Call</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Accountability audit ledger opened.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>View Accountability Log</span>
              </button>

              <div className="border-t border-slate-700/30 my-1" />

              {/* Group 3: Utility & Lifecycle */}
              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Load #${selectedLoadForShortcuts.loadId} duplicated.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Load</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLoadForShortcuts(null);
                  showToast(`Load archived to historical freight repository.`);
                }}
                className={`w-full text-left px-3 py-1.5 rounded flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#16244E] hover:text-white' : 'hover:bg-slate-100'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-slate-400" />
                <span>Archive Load</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Viewer Modal */}
      {selectedReceiptUrl && (
        <ReceiptViewerModal
          isOpen={!!selectedReceiptUrl}
          onClose={() => setSelectedReceiptUrl(null)}
          url={selectedReceiptUrl}
          title={receiptModalTitle}
        />
      )}

      {/* Tax Invoice Studio Dual-Pane Modal */}
      {selectedTripForInvoice && (
        <TaxInvoiceModal
          isOpen={!!selectedTripForInvoice}
          onClose={() => setSelectedTripForInvoice(null)}
          trip={selectedTripForInvoice}
        />
      )}
    </div>
  );
};
