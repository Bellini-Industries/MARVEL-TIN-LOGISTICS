import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Trip, TripInvoice, FuelLog, Expense, PettyCash, CurrencyCode } from '../types';
import {
  formatCurrency,
  convertCurrency,
  convertToUSD,
  formatDateOnly,
  formatDateTime,
  extractTruckRegistration
} from '../utils/helpers';
import { TaxInvoiceModal } from './TaxInvoiceModal';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import {
  Search,
  Settings,
  Calendar,
  Bell,
  ChevronDown,
  Plus,
  RefreshCw,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Briefcase,
  Database,
  BarChart3,
  Activity,
  Layers,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowRight,
  Check,
  X,
  Sparkles,
  Building,
  Tag,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  Fuel,
  Receipt,
  Wallet,
  ShieldCheck,
  DollarSign,
  Scale,
  Compass,
  Printer,
  Download,
  Eye,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';

interface TaskItem {
  id: string;
  name: string;
  assignee: {
    name: string;
    avatar: string;
    initials: string;
    role: string;
  };
  status: 'Open' | 'Overdue' | 'In Progress' | 'Completed';
  dueBy: string;
  isOverdue?: boolean;
  appWorkspace: string;
  tags: string[];
}

interface LightAccountingDashboardProps {
  onOpenTripModal?: () => void;
  onOpenPettyCashModal?: (truckId?: string) => void;
  onSwitchToTmsView?: () => void;
}

export const LightAccountingDashboard: React.FC<LightAccountingDashboardProps> = ({
  onOpenTripModal,
  onOpenPettyCashModal,
  onSwitchToTmsView
}) => {
  const {
    trips,
    filteredTrips,
    fuelLogs,
    filteredFuelLogs,
    expenses,
    filteredExpenses,
    maintenance,
    filteredMaintenance,
    pettyCash,
    calculatePettyCashBalance,
    exchangeRates,
    selectedTruckFilter
  } = useFleet();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Navigation states
  const [activeNavItem, setActiveNavItem] = useState<string>('Accounting Dashboard');
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'ZAR' | 'BWP'>('USD');
  const [glCategoryFilter, setGlCategoryFilter] = useState<'All' | 'Asset' | 'Liability' | 'Revenue' | 'Expense'>('All');

  // Modal inspection states
  const [selectedTripForInvoice, setSelectedTripForInvoice] = useState<Trip | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [receiptModalTitle, setReceiptModalTitle] = useState('Document / Receipt Slip');

  // Sub-tab filters for Invoices and Fuel views
  const [invoiceTabFilter, setInvoiceTabFilter] = useState<'all' | 'unpaid' | 'paid' | 'zero_rated'>('all');
  const [debtorAgingFilter, setDebtorAgingFilter] = useState<'all' | 'current' | '30days' | '60days'>('all');

  // =========================================================================
  // KEY SYSTEM METRICS INTEGRATION (Real-time accounting ledger calculations)
  // =========================================================================

  // 1. Gross Freight Billed
  const grossRevenueUSD = useMemo(() => {
    return trips.reduce((sum, trip) => {
      if (trip.revenueUSD) return sum + trip.revenueUSD;
      if (typeof trip.agreedRate === 'object' && trip.agreedRate?.rate) {
        return sum + trip.agreedRate.rate * (trip.weightTons || 32);
      }
      return sum + 4850;
    }, 0);
  }, [trips]);

  // 2. Diesel Fuel Spend & Litres
  const totalFuelLitres = useMemo(() => {
    return fuelLogs.reduce((acc, curr) => acc + (curr.litres || 0), 0);
  }, [fuelLogs]);

  const totalFuelCostUSD = useMemo(() => {
    return fuelLogs.reduce(
      (acc, curr) => acc + convertToUSD(curr.cost, curr.currency, exchangeRates),
      0
    );
  }, [fuelLogs, exchangeRates]);

  // 3. Tollgates, Permits & Road Expenses
  const totalExpensesUSD = useMemo(() => {
    return expenses.reduce(
      (acc, curr) => acc + convertToUSD(curr.amount, curr.currency, exchangeRates),
      0
    );
  }, [expenses, exchangeRates]);

  // 4. Workshop Maintenance
  const totalMaintenanceUSD = useMemo(() => {
    return maintenance.reduce(
      (acc, curr) => acc + convertToUSD(curr.cost, curr.currency, exchangeRates),
      0
    );
  }, [maintenance, exchangeRates]);

  // 5. Driver Petty Cash Floats
  const floatJRB = calculatePettyCashBalance('JRB 216MP');
  const floatKBR = calculatePettyCashBalance('KBR 813MP');
  const floatKBR_USD = convertToUSD(floatKBR, 'ZAR', exchangeRates);
  const combinedFloatsUSD = floatJRB + floatKBR_USD;

  // 5b. Interactive Invoices & Live Debtors
  const [invoices, setInvoices] = useState([
    {
      id: 'INV-2026-881',
      tripRef: 'TRP-2026-0842',
      customer: 'African Mineral Logistics (Pty) Ltd',
      date: '2026-10-22',
      dueDate: '2026-11-21',
      vatType: 'Zero-Rated Export (0%)',
      amountUSD: 4850,
      status: 'Sent' as const,
      truck: 'JRB 216MP',
      route: 'Kamativi Depot → Durban Port',
      tripObj: trips[0] || null
    },
    {
      id: 'INV-2026-882',
      tripRef: 'TRP-2026-0843',
      customer: 'Zambezi Mining Supplies Ltd',
      date: '2026-10-23',
      dueDate: '2026-11-22',
      vatType: 'Zero-Rated Export (0%)',
      amountUSD: 5400,
      status: 'Pending' as const,
      truck: 'KBR 813MP',
      route: 'Johannesburg → Chirundu / Lusaka',
      tripObj: trips[1] || null
    },
    {
      id: 'INV-2026-879',
      tripRef: 'TRP-2026-0839',
      customer: 'KCBE Trans Africa Logistics',
      date: '2026-10-14',
      dueDate: '2026-10-28',
      vatType: 'SA Domestic (15% VAT)',
      amountUSD: 3650,
      status: 'Paid' as const,
      truck: 'JRB 216MP',
      route: 'Musina Bay → Pomona JHB',
      tripObj: trips[0] || null
    },
    {
      id: 'INV-2026-876',
      tripRef: 'TRP-2026-0835',
      customer: 'Anglo Platinum Consortia',
      date: '2026-10-02',
      dueDate: '2026-10-16',
      vatType: 'Zero-Rated Export (0%)',
      amountUSD: 6200,
      status: 'Paid' as const,
      truck: 'KBR 813MP',
      route: 'Rustenburg → Beitbridge Gate',
      tripObj: trips[1] || null
    }
  ]);

  const outstandingDebtorsUSD = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + inv.amountUSD, 0);
  }, [invoices]);

  const toggleInvoicePaidStatus = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? { ...inv, status: inv.status === 'Paid' ? 'Pending' : 'Paid' }
          : inv
      )
    );
    const target = invoices.find((inv) => inv.id === id);
    const newStatus = target?.status === 'Paid' ? 'Pending' : 'Paid';
    setActionNotice(`Invoice ${id} marked as ${newStatus}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // 6. Net Operating Margin
  const totalCostsUSD = totalFuelCostUSD + totalExpensesUSD + totalMaintenanceUSD;
  const netOperatingProfitUSD = Math.max(0, grossRevenueUSD - totalCostsUSD);
  const netMarginPct = grossRevenueUSD > 0
    ? Number(((netOperatingProfitUSD / grossRevenueUSD) * 100).toFixed(1))
    : 34.8;

  // 7. Dynamic Summary Cards (Freight Accounting KPIs)
  const summaryCards = useMemo(() => [
    {
      id: 'gross-freight',
      title: 'Gross Freight Billed',
      value: formatCurrency(convertCurrency(grossRevenueUSD, 'USD', activeCurrency, exchangeRates), activeCurrency),
      change: '+18.4%',
      isPositive: true,
      subtitle: `${trips.length} SADC Corridor Waybills`,
      icon: TrendingUp,
      iconBg: 'bg-indigo-50 text-indigo-600',
      actionTab: 'Invoices & Receivables'
    },
    {
      id: 'diesel-spend',
      title: 'Diesel Fuel Spend',
      value: formatCurrency(convertCurrency(totalFuelCostUSD, 'USD', activeCurrency, exchangeRates), activeCurrency),
      change: `${totalFuelLitres.toLocaleString()} L`,
      isPositive: false,
      subtitle: '38.2 L/100km corridor burn',
      icon: Fuel,
      iconBg: 'bg-amber-50 text-amber-600',
      actionTab: 'Accounts Payable & Fuel'
    },
    {
      id: 'invoices-pipeline',
      title: 'Debtors & Invoices',
      value: `${invoices.length} Invoices`,
      change: `${invoices.filter((i) => i.status !== 'Paid').length} Unpaid`,
      isPositive: invoices.filter((i) => i.status !== 'Paid').length <= 2,
      subtitle: `${formatCurrency(convertCurrency(outstandingDebtorsUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)} due`,
      icon: Receipt,
      iconBg: 'bg-blue-50 text-blue-600',
      actionTab: 'Invoices & Receivables'
    },
    {
      id: 'driver-floats',
      title: 'Driver Cash Floats',
      value: formatCurrency(convertCurrency(combinedFloatsUSD, 'USD', activeCurrency, exchangeRates), activeCurrency),
      change: '2 Trucks',
      isPositive: true,
      subtitle: `JRB: $${floatJRB} · KBR: R${floatKBR.toLocaleString()}`,
      icon: Wallet,
      iconBg: 'bg-emerald-50 text-emerald-600',
      actionTab: 'Petty Cash & Floats'
    },
    {
      id: 'net-operating-margin',
      title: 'Net Operating Margin',
      value: `${netMarginPct}%`,
      change: `+${formatCurrency(convertCurrency(netOperatingProfitUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}`,
      isPositive: true,
      subtitle: 'SARS Section 20 Audited',
      icon: ShieldCheck,
      iconBg: 'bg-purple-50 text-purple-600',
      actionTab: 'Reports'
    }
  ], [
    grossRevenueUSD,
    totalFuelCostUSD,
    totalFuelLitres,
    combinedFloatsUSD,
    floatJRB,
    floatKBR,
    netOperatingProfitUSD,
    netMarginPct,
    activeCurrency,
    exchangeRates,
    trips.length,
    invoices,
    outstandingDebtorsUSD
  ]);

  // Tasks Data matching accounting workflows
  const initialTasks: TaskItem[] = [
    {
      id: 'TSK-1041',
      name: 'Verify SARS VAT 201 filing and cross-border rebate export documentation for Trip TRP-2026-0842',
      assignee: {
        name: 'Rachel Adams',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
        initials: 'RA',
        role: 'Senior Controller'
      },
      status: 'Open',
      dueBy: 'Oct 28, 2026',
      isOverdue: false,
      appWorkspace: 'Financial Center / SARS VAT 201',
      tags: ['Tax Compliance', 'Export Rebate']
    },
    {
      id: 'TSK-1042',
      name: 'Reconcile Beitbridge CD3 customs bond clearing deposits with ZIMRA official receipts',
      assignee: {
        name: 'Michael Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
        initials: 'MC',
        role: 'Border Controller'
      },
      status: 'Overdue',
      dueBy: 'Oct 24, 2026',
      isOverdue: true,
      appWorkspace: 'Customs & SADC Dossiers',
      tags: ['Urgent', 'Border Clearing']
    },
    {
      id: 'TSK-1043',
      name: 'Review driver cash float reconciliation and toll vouchers for Scania JRB 216MP',
      assignee: {
        name: 'Anthony Ndlovu',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
        initials: 'AN',
        role: 'Fleet Accountant'
      },
      status: 'Open',
      dueBy: 'Oct 30, 2026',
      isOverdue: false,
      appWorkspace: 'Petty Cash / Float Audit',
      tags: ['Petty Cash', 'Fuel Audit']
    },
    {
      id: 'TSK-1044',
      name: 'Audit commercial freight invoice #INV-2026-881 for African Mineral Logistics (32.4 tons tin ore)',
      assignee: {
        name: 'Nomsa Dlamini',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        initials: 'ND',
        role: 'Chief Controller'
      },
      status: 'In Progress',
      dueBy: 'Nov 02, 2026',
      isOverdue: false,
      appWorkspace: 'Client Accounts / Durban Port',
      tags: ['Invoicing', 'Monthly Close']
    },
    {
      id: 'TSK-1045',
      name: 'Approve bulk diesel purchase ledger #DSL-9921 from Engen Polokwane (520 Litres @ R23.00/L)',
      assignee: {
        name: 'David Nkosi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces',
        initials: 'DN',
        role: 'Accounts Payable'
      },
      status: 'Completed',
      dueBy: 'Oct 25, 2026',
      isOverdue: false,
      appWorkspace: 'Vendor Ledger / Engen',
      tags: ['Diesel Fuel', 'Verified']
    }
  ];

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  // Filter tasks based on search and tags
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.appWorkspace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        selectedTagFilter === 'All' || t.tags.includes(selectedTagFilter) || t.status === selectedTagFilter;

      return matchesSearch && matchesTag;
    });
  }, [tasks, searchQuery, selectedTagFilter]);

  // Filtered Invoices based on search & tab selection
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        searchQuery === '' ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.truck.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        invoiceTabFilter === 'all'
          ? true
          : invoiceTabFilter === 'unpaid'
          ? inv.status !== 'Paid'
          : invoiceTabFilter === 'paid'
          ? inv.status === 'Paid'
          : inv.vatType.includes('Zero-Rated');

      return matchesSearch && matchesFilter;
    });
  }, [invoices, searchQuery, invoiceTabFilter]);

  // Filtered Fuel Logs based on search
  const filteredFuelList = useMemo(() => {
    return fuelLogs.filter((log) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const truckReg = extractTruckRegistration(log.truckId).toLowerCase();
      return (
        log.stationName.toLowerCase().includes(query) ||
        (log.location && log.location.toLowerCase().includes(query)) ||
        truckReg.includes(query)
      );
    });
  }, [fuelLogs, searchQuery]);

  // Chart of Accounts (COA) for General Ledger Master
  const chartOfAccounts = useMemo(() => [
    { code: '1010', name: 'Cash & Bank: FNB Cross-Border USD', category: 'Asset', type: 'Debit', balanceUSD: 24500, note: 'Primary freight collection account' },
    { code: '1020', name: 'Cash & Bank: Nedbank Corporate ZAR', category: 'Asset', type: 'Debit', balanceUSD: 16800, note: 'Fuel cards & domestic payroll account' },
    { code: '1100', name: 'Driver Petty Cash & Toll Floats', category: 'Asset', type: 'Debit', balanceUSD: combinedFloatsUSD, note: 'Active cash imprest held by drivers' },
    { code: '1200', name: 'Trade Receivables (Freight Debtors)', category: 'Asset', type: 'Debit', balanceUSD: outstandingDebtorsUSD, note: 'Pending shipper invoices' },
    { code: '1500', name: 'Fleet Equipment (Trucks & Trailers)', category: 'Asset', type: 'Debit', balanceUSD: 380000, note: 'JRB 216MP & KBR 813MP asset book value' },
    { code: '2010', name: 'SARS VAT 201 Output Liability', category: 'Liability', type: 'Credit', balanceUSD: 1420, note: '15% SA domestic leg VAT accrued' },
    { code: '2050', name: 'Customs Transit Guarantee Bonds', category: 'Liability', type: 'Credit', balanceUSD: 5000, note: 'ZIMRA CD3 & BURS refundable bond' },
    { code: '2100', name: 'Trade Creditors: Bulk Fuel Accounts', category: 'Liability', type: 'Credit', balanceUSD: 8950, note: 'Engen & Total 30-day diesel facility' },
    { code: '4100', name: 'Gross Freight Revenue (SADC Corridors)', category: 'Revenue', type: 'Credit', balanceUSD: grossRevenueUSD, note: 'Zero-rated cross-border mineral freight' },
    { code: '5100', name: 'Direct Cost: En-Route Diesel Burn', category: 'Expense', type: 'Debit', balanceUSD: totalFuelCostUSD, note: `${totalFuelLitres.toLocaleString()} Litres pumped` },
    { code: '5200', name: 'Direct Cost: Border Clearances & Tolls', category: 'Expense', type: 'Debit', balanceUSD: totalExpensesUSD, note: 'Beitbridge, Chirundu & N1 tollgates' },
    { code: '5300', name: 'Direct Cost: Maintenance & Workshop', category: 'Expense', type: 'Debit', balanceUSD: totalMaintenanceUSD, note: 'Preventative servicing & tyres' }
  ], [combinedFloatsUSD, outstandingDebtorsUSD, grossRevenueUSD, totalFuelCostUSD, totalExpensesUSD, totalMaintenanceUSD, totalFuelLitres]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-800">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-indigo-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Structural Layout: Fixed Left Sidebar + Main Content Area */}
      <div className="flex flex-1 min-h-screen">
        {/* 1. Left Sidebar (Purple Theme: bg-indigo-600) */}
        <aside className="w-64 bg-indigo-600 text-white flex flex-col shrink-0 select-none shadow-xl z-20">
          {/* Top Logo & Company Name */}
          <div className="h-16 flex items-center px-6 border-b border-indigo-500/40 space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center font-black text-lg shadow-sm">
              <Building className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider block text-white uppercase leading-none">
                SWEDY FREIGHT
              </span>
              <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold block mt-1">
                Financial Controller
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {/* 1. Accounting Dashboard (Primary) */}
            <button
              onClick={() => setActiveNavItem('Accounting Dashboard')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                activeNavItem === 'Accounting Dashboard'
                  ? 'bg-indigo-700 text-white font-bold shadow-sm'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-white" />
              <span className="flex-1">Accounting Dashboard</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>

            {/* 2. Invoices & Receivables */}
            <button
              onClick={() => setActiveNavItem('Invoices & Receivables')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                activeNavItem === 'Invoices & Receivables'
                  ? 'bg-indigo-700 text-white font-bold shadow-sm'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0 text-indigo-200" />
              <span className="flex-1">Invoices & Receivables</span>
              <span className="text-[10px] bg-indigo-500/60 px-1.5 py-0.2 rounded-full font-mono text-indigo-100">
                {invoices.length}
              </span>
            </button>

            {/* 3. Accounts Payable & Fuel */}
            <button
              onClick={() => setActiveNavItem('Accounts Payable & Fuel')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                activeNavItem === 'Accounts Payable & Fuel'
                  ? 'bg-indigo-700 text-white font-bold shadow-sm'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <Fuel className="w-4 h-4 shrink-0 text-indigo-200" />
              <span className="flex-1">Accounts Payable & Fuel</span>
              <span className="text-[10px] bg-indigo-500/60 px-1.5 py-0.2 rounded-full font-mono text-indigo-100">
                {fuelLogs.length}
              </span>
            </button>

            {/* 4. Petty Cash & Floats */}
            <button
              onClick={() => setActiveNavItem('Petty Cash & Floats')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                activeNavItem === 'Petty Cash & Floats'
                  ? 'bg-indigo-700 text-white font-bold shadow-sm'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4 shrink-0 text-indigo-200" />
              <span className="flex-1">Petty Cash & Floats</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full font-mono">
                ${floatJRB}
              </span>
            </button>

            {/* 5. Tax & SARS VAT 201 */}
            <button
              onClick={() => setActiveNavItem('Tax & SARS VAT 201')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                activeNavItem === 'Tax & SARS VAT 201'
                  ? 'bg-indigo-700 text-white font-bold shadow-sm'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4 shrink-0 text-indigo-200" />
              <span>Tax & SARS VAT 201</span>
            </button>

            {/* 6. Tasks Dashboard */}
            <button
              onClick={() => setActiveNavItem('Tasks Dashboard')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                activeNavItem === 'Tasks Dashboard'
                  ? 'bg-indigo-700 text-white font-bold'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0 text-indigo-200" />
              <span className="flex-1">Tasks Dashboard</span>
              <span className="text-[10px] bg-rose-500/30 text-rose-200 font-bold px-1.5 py-0.2 rounded-full">
                {tasks.filter((t) => t.isOverdue).length} Overdue
              </span>
            </button>

            {/* 7. Masters (with dropdown arrow) */}
            <div>
              <button
                onClick={() => setIsMastersOpen(!isMastersOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium text-indigo-100 hover:bg-indigo-500/40 hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center space-x-3">
                  <Database className="w-4 h-4 shrink-0 text-indigo-200" />
                  <span>Masters</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-indigo-200 transition-transform ${isMastersOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isMastersOpen && (
                <div className="pl-9 pr-2 py-1 space-y-1 text-xs text-indigo-100 animate-in fade-in duration-150">
                  <button
                    onClick={() => setActiveNavItem('Client Master')}
                    className={`w-full text-left py-1.5 px-2 rounded transition-colors ${
                      activeNavItem === 'Client Master' ? 'bg-indigo-700 text-white font-bold' : 'hover:bg-indigo-500/30 hover:text-white'
                    }`}
                  >
                    Client Master
                  </button>
                  <button
                    onClick={() => setActiveNavItem('General Ledger Master')}
                    className={`w-full text-left py-1.5 px-2 rounded transition-colors ${
                      activeNavItem === 'General Ledger Master' ? 'bg-indigo-700 text-white font-bold' : 'hover:bg-indigo-500/30 hover:text-white'
                    }`}
                  >
                    General Ledger Master
                  </button>
                  <button
                    onClick={() => setActiveNavItem('Fleet Cost Centers')}
                    className={`w-full text-left py-1.5 px-2 rounded transition-colors ${
                      activeNavItem === 'Fleet Cost Centers' ? 'bg-indigo-700 text-white font-bold' : 'hover:bg-indigo-500/30 hover:text-white'
                    }`}
                  >
                    Fleet Cost Centers
                  </button>
                </div>
              )}
            </div>

            {/* 8. Reports */}
            <button
              onClick={() => setActiveNavItem('Reports')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                activeNavItem === 'Reports'
                  ? 'bg-indigo-700 text-white font-bold'
                  : 'text-indigo-100 hover:bg-indigo-500/40 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-indigo-200" />
              <span>P&L Reports</span>
            </button>

            {/* Switch to Freight TMS Load Ledger View */}
            {onSwitchToTmsView && (
              <div className="pt-3 mt-3 border-t border-indigo-500/40">
                <button
                  onClick={onSwitchToTmsView}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg bg-indigo-700/60 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-200" />
                  <span>AscendTMS Load Ledger</span>
                </button>
              </div>
            )}
          </nav>

          {/* Bottom Sidebar: Settings and System Status */}
          <div className="p-4 border-t border-indigo-500/40 flex items-center justify-between text-xs text-indigo-200">
            <button
              title="Accounting Settings"
              className="p-1.5 rounded-lg hover:bg-indigo-500/40 hover:text-white transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>General Ledger Live</span>
            </div>
          </div>
        </aside>

        {/* Right Area: Top Header + Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 2. Top Header */}
          <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
            {/* Search Bar on Left */}
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoices, fuel vouchers, ledger accounts, waybills..."
                className="w-full bg-gray-100 hover:bg-gray-200/70 focus:bg-white text-gray-800 placeholder-gray-400 text-xs rounded-full pl-10 pr-4 py-2 border border-transparent focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            {/* Right Side Currency Selector, Action Buttons & Profile */}
            <div className="flex items-center space-x-3">
              {/* Multi-Currency Selector */}
              <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-full border border-gray-200 text-[11px] font-mono">
                {(['USD', 'ZAR', 'BWP'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setActiveCurrency(curr)}
                    className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      activeCurrency === curr
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>

              {/* Calendar Quick Indicator */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsCalendarOpen(!isCalendarOpen);
                    setIsNotificationsOpen(false);
                    setIsSettingsOpen(false);
                    setUserDropdownOpen(false);
                  }}
                  title="Fiscal Calendar"
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isCalendarOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
                {isCalendarOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2.5">
                      <h4 className="font-bold text-gray-900 flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Fiscal Deadlines</span>
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-600 font-mono">October 2026</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                        <div className="flex justify-between font-bold text-indigo-900 text-[11px]">
                          <span>25th Oct</span>
                          <span className="text-[10px] bg-indigo-200/60 px-1 rounded">SARS VAT 201</span>
                        </div>
                        <p className="text-[10px] text-indigo-700 mt-0.5">Submit Section 11(1)(a) Zero-rated export return</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="flex justify-between font-bold text-amber-900 text-[11px]">
                          <span>28th Oct</span>
                          <span className="text-[10px] bg-amber-200/60 px-1 rounded">Driver Floats</span>
                        </div>
                        <p className="text-[10px] text-amber-700 mt-0.5">Bi-weekly petty cash and toll voucher count</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <div className="flex justify-between font-bold text-emerald-900 text-[11px]">
                          <span>31st Oct</span>
                          <span className="text-[10px] bg-emerald-200/60 px-1 rounded">Month-End Close</span>
                        </div>
                        <p className="text-[10px] text-emerald-700 mt-0.5">Reconcile debtor invoices & diesel ledgers</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification with Badge */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsCalendarOpen(false);
                    setIsSettingsOpen(false);
                    setUserDropdownOpen(false);
                    setNotificationCount(0);
                  }}
                  title="Accounting Alerts"
                  className={`p-2 rounded-full transition-colors cursor-pointer relative ${
                    isNotificationsOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                      <h4 className="font-bold text-gray-900 flex items-center space-x-1.5">
                        <Bell className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Accounting Alerts</span>
                      </h4>
                      <span className="text-[10px] text-emerald-600 font-semibold">All Clear</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 cursor-pointer hover:bg-rose-100/70 transition-colors"
                        onClick={() => {
                          setActiveNavItem('Tasks Dashboard');
                          setIsNotificationsOpen(false);
                        }}
                      >
                        <span className="font-bold text-rose-800 text-[11px] block">Overdue Customs CD3 Deposit</span>
                        <p className="text-[10px] text-rose-600 mt-0.5">Beitbridge border clearing reconciliation pending</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setActiveNavItem('Invoices & Receivables');
                          setIsNotificationsOpen(false);
                        }}
                      >
                        <span className="font-bold text-gray-800 text-[11px] block">Invoice #INV-2026-881 Ready</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">Commercial freight invoice for African Mineral Logistics</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setActiveNavItem('Petty Cash & Floats');
                          setIsNotificationsOpen(false);
                        }}
                      >
                        <span className="font-bold text-gray-800 text-[11px] block">Driver Float Audited</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">Scania JRB 216MP has $190.00 USD cash remaining</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsSettingsOpen(!isSettingsOpen);
                    setIsCalendarOpen(false);
                    setIsNotificationsOpen(false);
                    setUserDropdownOpen(false);
                  }}
                  title="Accounting Preferences"
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isSettingsOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </button>
                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-gray-900 pb-2 border-b border-gray-100 mb-2">Accounting Config</h4>
                    <div className="space-y-2 text-gray-600 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span>Ledger Base:</span>
                        <strong className="text-gray-900 font-mono">USD ($)</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>SARS Section 20:</span>
                        <span className="text-emerald-600 font-bold">Enabled</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Auto Forex Sync:</span>
                        <span className="text-indigo-600 font-bold">Live SARB/ZIM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>VAT Period:</span>
                        <span className="text-gray-800 font-mono">Category B (Monthly)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              {/* User Profile Avatar with Dropdown Arrow */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full object-cover border border-indigo-200"
                  />
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-gray-800 block leading-tight">Nomsa Dlamini</span>
                    <span className="text-[10px] text-gray-500 block leading-none">Financial Controller</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 text-xs text-gray-700 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="font-bold text-gray-900">Nomsa Dlamini</p>
                      <p className="text-[11px] text-gray-500">controller@swedyfreight.com</p>
                      <span className="mt-1 inline-block px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded-full border border-emerald-200">
                        SARS Registered Agent #AGT-8812
                      </span>
                    </div>
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>Accounting Profile</span>
                    </button>
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2 text-rose-600"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      <span>Close Session</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* 3. Main Content Area */}
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Header Title & Top Right Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                      {activeNavItem}
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                      SARS Section 20
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live operational metrics, client portfolio distributions, and freight accounting pipelines.
                  </p>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => {
                      if (trips.length > 0) {
                        setSelectedTripForInvoice(trips[0]);
                      }
                    }}
                    className="text-xs font-bold text-white px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
                    title="Generate or audit official tax invoice and POD vouchers"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Generate Tax Invoice / Audit</span>
                  </button>

                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live GL Active</span>
                  </div>
                </div>
              </div>

              {/* 5 Summary Cards Row (Cleaned up from healthcare placeholders to freight accounting KPIs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {summaryCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setActiveNavItem(card.actionTab)}
                      className="bg-gray-100 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all rounded-xl p-4 border border-gray-200/70 shadow-xs flex flex-col justify-between cursor-pointer group"
                      title={`Click to view ${card.title}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg} group-hover:scale-105 transition-transform`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xl font-black text-gray-900 tracking-tight font-mono">
                          {card.value}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="text-xs font-bold text-gray-800 truncate">
                          {card.title}
                        </h4>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className={card.isPositive ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {card.change}
                          </span>
                          <span className="text-gray-500 text-[10px] truncate max-w-[100px]">
                            {card.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* =========================================================================
                  TAB CONTENT 1: ACCOUNTING DASHBOARD (OVERVIEW)
                 ========================================================================= */}
              {activeNavItem === 'Accounting Dashboard' && (
                <>
                  {/* Middle Section (Grid Layout: Left Card, Center Card, Right Column Stack) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Card: Fleet Cost Center Master */}
                    <div className="lg:col-span-3 bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2.5 mb-3">
                          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                            <Building className="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-gray-900">Fleet Cost Centers</h3>
                            <span className="text-[10px] text-gray-400">Asset & Driver Accounts</span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                          Centralized vehicle cost accounts (JRB 216MP & KBR 813MP), driver subsistence payroll allowances, PrDP compliance discs, and cross-border GIT cargo policies.
                        </p>

                        <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Cost Center 01 (JRB 216MP):</span>
                            <strong className="text-gray-900 font-mono">Tichaona</strong>
                          </div>
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Cost Center 02 (KBR 813MP):</span>
                            <strong className="text-gray-900 font-mono">Anthony</strong>
                          </div>
                          <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-gray-200">
                            <span>GIT Marine Insurance:</span>
                            <strong className="text-emerald-600 font-mono">R2,500,000 Active</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveNavItem('Fleet Cost Centers')}
                        className="mt-4 w-full py-2 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                      >
                        <span>View Cost Ledger</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>

                    {/* Center Card: Client Analysis & SADC Corridor Revenue (Two Donut Charts Side-by-Side) */}
                    <div className="lg:col-span-6 bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">
                            Client analysis chart report
                          </h3>
                          <p className="text-[11px] text-gray-400">
                            Freight revenue breakdown by corporate classification & SADC destination
                          </p>
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          FY 2026 Active
                        </span>
                      </div>

                      {/* Two Donut Charts Side-by-Side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3 items-center">
                        {/* Donut Chart 1: Client Industry Sector */}
                        <div className="flex flex-col items-center p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                          <h4 className="text-xs font-bold text-gray-700 mb-2">Industry Sector</h4>

                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#e5e7eb" strokeWidth="4" />
                              {/* Mining 50% */}
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#4f46e5" strokeWidth="4" strokeDasharray="44 100" strokeDashoffset="0" />
                              {/* Industrial Mach 30% */}
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10b981" strokeWidth="4" strokeDasharray="26 100" strokeDashoffset="-44" />
                              {/* FMCG & Bulk 20% */}
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f59e0b" strokeWidth="4" strokeDasharray="18 100" strokeDashoffset="-70" />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-sm font-black text-gray-900 block leading-none font-mono">50%</span>
                              <span className="text-[9px] text-gray-400 block mt-0.5">Mining</span>
                            </div>
                          </div>

                          <div className="mt-3 w-full space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-600">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                                <span>Mining Ore (50%)</span>
                              </div>
                              <span className="font-bold text-gray-800 font-mono">
                                {formatCurrency(convertCurrency(grossRevenueUSD * 0.5, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-gray-600">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span>Machinery (30%)</span>
                              </div>
                              <span className="font-bold text-gray-800 font-mono">
                                {formatCurrency(convertCurrency(grossRevenueUSD * 0.3, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-gray-600">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                <span>FMCG & Bulk (20%)</span>
                              </div>
                              <span className="font-bold text-gray-800 font-mono">
                                {formatCurrency(convertCurrency(grossRevenueUSD * 0.2, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Donut Chart 2: Destination Country */}
                        <div className="flex flex-col items-center p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                          <h4 className="text-xs font-bold text-gray-700 mb-2">Transit Corridor</h4>

                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#e5e7eb" strokeWidth="4" />
                              {/* South Africa 45% */}
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="40 100" strokeDashoffset="0" />
                              {/* Zimbabwe 35% */}
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#0284c7" strokeWidth="4" strokeDasharray="31 100" strokeDashoffset="-40" />
                              {/* Zambia/Botswana 20% */}
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f43f5e" strokeWidth="4" strokeDasharray="18 100" strokeDashoffset="-71" />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-sm font-black text-gray-900 block leading-none">SADC</span>
                              <span className="text-[9px] text-gray-400 block mt-0.5">Transit</span>
                            </div>
                          </div>

                          <div className="mt-3 w-full space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-gray-600">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                <span>South Africa (45%)</span>
                              </div>
                              <span className="font-bold text-gray-800 font-mono">
                                {formatCurrency(convertCurrency(grossRevenueUSD * 0.45, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-gray-600">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                                <span>Zimbabwe (35%)</span>
                              </div>
                              <span className="font-bold text-gray-800 font-mono">
                                {formatCurrency(convertCurrency(grossRevenueUSD * 0.35, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-gray-600">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                <span>Zambia / BWP (20%)</span>
                              </div>
                              <span className="font-bold text-gray-800 font-mono">
                                {formatCurrency(convertCurrency(grossRevenueUSD * 0.20, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Source: General Ledger & Bank Feeds</span>
                        <button
                          onClick={() => setActiveNavItem('Reports')}
                          className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                        >
                          View Full P&L Statement
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Two stacked smaller cards (Audit Queue & Driver Float Balances) */}
                    <div className="lg:col-span-3 flex flex-col space-y-5">
                      {/* Top Stacked Card: 4 Compliance / Audit Queue */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">Compliance Audit Queue</h4>
                              <span className="text-[10px] text-gray-400">Audit & Regulatory Review</span>
                            </div>
                          </div>
                          <span className="text-xl font-black text-rose-600 font-mono">4</span>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-2">
                          4 active regulatory items require controller review (SARS zero-rated export proof, Beitbridge toll voucher, CD3 customs bond).
                        </p>

                        <button
                          onClick={() => setSelectedTagFilter('Tax Compliance')}
                          className="mt-3 text-left text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Review Audit Tasks</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Bottom Stacked Card: Driver Cash Float Balances */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                              <Wallet className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">Driver Cash Floats</h4>
                              <span className="text-[10px] text-gray-400">En-route Discretionary Funds</span>
                            </div>
                          </div>
                          <span className="text-base font-black text-emerald-600 font-mono">
                            ${floatJRB}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1 text-[11px]">
                          <div className="flex justify-between text-gray-600">
                            <span>JRB 216MP (Tichaona):</span>
                            <strong className="text-gray-900 font-mono">${floatJRB.toFixed(2)} USD</strong>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>KBR 813MP (Anthony):</span>
                            <strong className="text-gray-900 font-mono">R{floatKBR.toLocaleString()} ZAR</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveNavItem('Petty Cash & Floats')}
                          className="mt-3 text-left text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Manage Driver Floats</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Accounting Tasks & Audit Workflows Table */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          Accounting Tasks & Workflows
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          Active ledger reconcilements, invoice approvals, and border compliance tasks
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400 font-medium">Filter by tag:</span>
                        <select
                          value={selectedTagFilter}
                          onChange={(e) => setSelectedTagFilter(e.target.value)}
                          className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="All">All Tags</option>
                          <option value="Open">Open</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Tax Compliance">Tax Compliance</option>
                          <option value="Border Clearing">Border Clearing</option>
                          <option value="Petty Cash">Petty Cash</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/90 text-gray-600 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                            <th className="py-3 px-4">Task Name</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Due By</th>
                            <th className="py-3 px-4">App/Workspace</th>
                            <th className="py-3 px-4">Tags</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTasks.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-gray-400">
                                No tasks found matching your filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredTasks.map((task, idx) => (
                              <tr
                                key={task.id}
                                className={`transition-colors hover:bg-indigo-50/40 ${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'
                                }`}
                              >
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center space-x-3">
                                    <img
                                      src={task.assignee.avatar}
                                      alt={task.assignee.name}
                                      className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                                    />
                                    <div>
                                      <span className="font-bold text-gray-900 block leading-tight">
                                        {task.name}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        Assigned to: {task.assignee.name} ({task.assignee.role})
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {task.status === 'Open' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                      Open
                                    </span>
                                  )}
                                  {task.status === 'Overdue' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                                      Overdue
                                    </span>
                                  )}
                                  {task.status === 'In Progress' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                      In Progress
                                    </span>
                                  )}
                                  {task.status === 'Completed' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                      Completed
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-700">
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span className={task.isOverdue ? 'text-red-600 font-bold' : ''}>
                                      {task.dueBy}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-medium">
                                  {task.appWorkspace}
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {task.tags.map((tag, tIdx) => (
                                      <span
                                        key={tIdx}
                                        className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold border border-gray-200"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      setTasks((prev) =>
                                        prev.map((t) =>
                                          t.id === task.id
                                            ? { ...t, status: t.status === 'Completed' ? 'Open' : 'Completed' }
                                            : t
                                        )
                                      );
                                      setActionNotice(`Task "${task.id}" marked as ${task.status === 'Completed' ? 'Open' : 'Completed'}.`);
                                      setTimeout(() => setActionNotice(null), 3000);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer transition-colors"
                                  >
                                    {task.status === 'Completed' ? 'Reopen' : 'Mark Done'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* =========================================================================
                  TAB CONTENT 2: INVOICES & RECEIVABLES (DEBTORS AGING & SARS TAX INVOICES)
                 ========================================================================= */}
              {activeNavItem === 'Invoices & Receivables' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-900">Debtors Ledger & Tax Invoices</h2>
                        <p className="text-xs text-gray-500">Official commercial freight tax invoices under SARS Section 20</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setInvoiceTabFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          invoiceTabFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        All ({invoices.length})
                      </button>
                      <button
                        onClick={() => setInvoiceTabFilter('unpaid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          invoiceTabFilter === 'unpaid' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Pending / Due ({invoices.filter((i) => i.status !== 'Paid').length})
                      </button>
                      <button
                        onClick={() => setInvoiceTabFilter('paid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          invoiceTabFilter === 'paid' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Settled / Paid ({invoices.filter((i) => i.status === 'Paid').length})
                      </button>
                      <button
                        onClick={() => setInvoiceTabFilter('zero_rated')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          invoiceTabFilter === 'zero_rated' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Zero-Rated Export (0%)
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/90 text-gray-600 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                            <th className="py-3 px-4">Invoice #</th>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Corridor Route</th>
                            <th className="py-3 px-4">Issue Date</th>
                            <th className="py-3 px-4">Due Date</th>
                            <th className="py-3 px-4">VAT Classification</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-gray-400">
                                No invoices found matching the current filter.
                              </td>
                            </tr>
                          ) : (
                            filteredInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-indigo-50/40 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                                  {inv.id}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="font-bold text-gray-900 block">{inv.customer}</span>
                                  <span className="text-[10px] text-gray-400">Unit: {inv.truck}</span>
                                </td>
                                <td className="py-3.5 px-4 text-gray-600">
                                  {inv.route}
                                </td>
                                <td className="py-3.5 px-4 text-gray-500 font-mono">
                                  {inv.date}
                                </td>
                                <td className="py-3.5 px-4 text-gray-500 font-mono">
                                  {inv.dueDate}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    inv.vatType.includes('Zero-Rated')
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {inv.vatType}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono font-black text-gray-900 text-sm">
                                  {formatCurrency(convertCurrency(inv.amountUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.status === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      onClick={() => toggleInvoicePaidStatus(inv.id)}
                                      className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                                        inv.status === 'Paid'
                                          ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      }`}
                                    >
                                      {inv.status === 'Paid' ? 'Mark Due' : 'Mark Paid'}
                                    </button>
                                    <button
                                      onClick={() => setSelectedTripForInvoice(inv.tripObj)}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer inline-flex items-center space-x-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Preview</span>
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
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 3: ACCOUNTS PAYABLE & FUEL (DIESEL CONSUMPTION & TOLLS)
                 ========================================================================= */}
              {activeNavItem === 'Accounts Payable & Fuel' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-900">Diesel Fuel Accounts & Disbursements</h2>
                        <p className="text-xs text-gray-500">
                          {totalFuelLitres.toLocaleString()} Litres pumped across SADC fuel stations (Cost: {formatCurrency(convertCurrency(totalFuelCostUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                        Total Disbursements: {formatCurrency(convertCurrency(totalFuelCostUSD + totalExpensesUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/90 text-gray-600 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                            <th className="py-3 px-4">Station & Supplier</th>
                            <th className="py-3 px-4">Truck Registration</th>
                            <th className="py-3 px-4">Litres</th>
                            <th className="py-3 px-4">Date / Time</th>
                            <th className="py-3 px-4">Billed Cost</th>
                            <th className="py-3 px-4">Converted ({activeCurrency})</th>
                            <th className="py-3 px-4 text-right">Receipt Slip</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredFuelList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-400">
                                No fuel records match your search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredFuelList.map((log) => (
                            <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-gray-900 block">{log.stationName}</span>
                                <span className="text-[10px] text-gray-400">{log.location}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">
                                {extractTruckRegistration(log.truckId)}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-600">
                                {log.litres} L
                              </td>
                              <td className="py-3.5 px-4 text-gray-500 font-mono">
                                {formatDateTime(log.timestamp)}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">
                                {formatCurrency(log.cost, log.currency)}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                                {formatCurrency(convertCurrency(convertToUSD(log.cost, log.currency, exchangeRates), 'USD', activeCurrency, exchangeRates), activeCurrency)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {log.receiptUrl ? (
                                  <button
                                    onClick={() => {
                                      setSelectedReceiptUrl(log.receiptUrl);
                                      setReceiptModalTitle(`Diesel Slip: ${log.stationName} (${log.litres}L)`);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer inline-flex items-center space-x-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Slip</span>
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">No receipt</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 4: PETTY CASH & FLOATS (DRIVER CASH ON HAND)
                 ========================================================================= */}
              {activeNavItem === 'Petty Cash & Floats' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-900">Driver Petty Cash Floats</h2>
                        <p className="text-xs text-gray-500">Live reconciliation of driver cash on hand for border tolls, weighbridges, and emergency expenses</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onOpenPettyCashModal && (
                        <button
                          onClick={() => onOpenPettyCashModal('JRB 216MP')}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Top-Up Driver Float</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2 Truck Float Balance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900">JRB 216MP (Tichaona)</h3>
                            <span className="text-[10px] text-gray-400">USD Float Account</span>
                          </div>
                          <span className="text-2xl font-black text-emerald-600 font-mono">
                            ${floatJRB.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Operating on Kamativi → Beitbridge → Durban route. Standard float allocation $500.00 USD.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-400">Status: <strong>Compliant</strong></span>
                        {onOpenPettyCashModal && (
                          <button
                            onClick={() => onOpenPettyCashModal('JRB 216MP')}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            Add Deduction / Top-Up
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900">KBR 813MP (Anthony)</h3>
                            <span className="text-[10px] text-gray-400">ZAR Float Account</span>
                          </div>
                          <span className="text-2xl font-black text-indigo-600 font-mono">
                            R{floatKBR.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Operating on Johannesburg → Chirundu / Lusaka corridor. Standard float allocation R8,000.00 ZAR.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-400">Status: <strong>Compliant</strong></span>
                        {onOpenPettyCashModal && (
                          <button
                            onClick={() => onOpenPettyCashModal('KBR 813MP')}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            Add Deduction / Top-Up
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700">
                      Recent Float Movements & Expense Deductions
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/90 text-gray-600 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                            <th className="py-2.5 px-4">Truck</th>
                            <th className="py-2.5 px-4">Type</th>
                            <th className="py-2.5 px-4">Amount</th>
                            <th className="py-2.5 px-4">Balance After</th>
                            <th className="py-2.5 px-4">Date</th>
                            <th className="py-2.5 px-4">Linked Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pettyCash.map((pc) => (
                            <tr key={pc.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 font-mono font-bold text-gray-800">
                                {extractTruckRegistration(pc.truckId)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pc.type === 'top_up' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {pc.type === 'top_up' ? 'Deposit / Top-Up' : 'Expense Deduction'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-gray-900">
                                {formatCurrency(pc.amount, pc.currency)}
                              </td>
                              <td className="py-3 px-4 font-mono text-gray-600">
                                {formatCurrency(pc.balanceAfter, pc.currency)}
                              </td>
                              <td className="py-3 px-4 text-gray-500 font-mono">
                                {formatDateTime(pc.timestamp)}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {typeof pc.linkedExpenseId === 'string' && pc.linkedExpenseId
                                  ? pc.linkedExpenseId
                                  : 'Depot Float Replenishment'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 5: TAX & SARS VAT 201 (EXPORT REBATES & SECTION 20)
                 ========================================================================= */}
              {activeNavItem === 'Tax & SARS VAT 201' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-900">SARS Section 20 & VAT 201 Export Ledger</h2>
                        <p className="text-xs text-gray-500">Cross-border freight zero-rating compliance (Section 11(1)(a) Value-Added Tax Act)</p>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold">
                      Zero-Rated Tax Status: Approved
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
                      <span className="text-xs text-gray-400 font-bold block">SARS Prescribed Subsistence Rate</span>
                      <span className="text-2xl font-black text-gray-900 mt-1 block font-mono">$33.50 / day</span>
                      <p className="text-[11px] text-gray-500 mt-1">Cross-border daily driver meal allowance exempt from PAYE withholding.</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
                      <span className="text-xs text-gray-400 font-bold block">Zero-Rated Export Freight</span>
                      <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">0% SA VAT</span>
                      <p className="text-[11px] text-gray-500 mt-1">Exports from South Africa to Zimbabwe / Zambia are zero-rated under Section 11(1)(a).</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
                      <span className="text-xs text-gray-400 font-bold block">Domestic SADC Freight VAT</span>
                      <span className="text-2xl font-black text-indigo-600 mt-1 block font-mono">15.0% Standard</span>
                      <p className="text-[11px] text-gray-500 mt-1">Applicable to domestic legs within RSA borders (e.g. Durban to Johannesburg).</p>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 6: REPORTS & P&L
                 ========================================================================= */}
              {activeNavItem === 'Reports' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                      <div>
                        <h2 className="font-black text-base text-gray-900">Profit & Loss Statement (P&L)</h2>
                        <p className="text-xs text-gray-500">Live operational financial statement across all SADC freight corridors</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => window.print()}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center space-x-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-gray-500" />
                          <span>Print Statement</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between py-2 border-b border-gray-100 font-semibold text-gray-700">
                        <span>1. Total Gross Freight Revenue:</span>
                        <strong className="text-gray-900 font-mono text-sm">
                          +{formatCurrency(convertCurrency(grossRevenueUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 text-gray-600 pl-4">
                        <span>- Diesel Fuel Consumption ({totalFuelLitres.toLocaleString()} Litres):</span>
                        <strong className="text-amber-600 font-mono">
                          -{formatCurrency(convertCurrency(totalFuelCostUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 text-gray-600 pl-4">
                        <span>- Tollgate Fees & Border Clearance Expenses:</span>
                        <strong className="text-rose-600 font-mono">
                          -{formatCurrency(convertCurrency(totalExpensesUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 text-gray-600 pl-4">
                        <span>- Fleet Maintenance & Workshop Repairs:</span>
                        <strong className="text-rose-600 font-mono">
                          -{formatCurrency(convertCurrency(totalMaintenanceUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                        </strong>
                      </div>
                      <div className="flex justify-between py-3 font-black text-sm text-emerald-600 bg-emerald-50/60 px-3 rounded-lg border border-emerald-200 mt-2">
                        <span>Net Operating Profit ({netMarginPct}% Margin):</span>
                        <strong className="font-mono text-base">
                          +{formatCurrency(convertCurrency(netOperatingProfitUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 7: CLIENT MASTER & ACCOUNTS
                 ========================================================================= */}
              {(activeNavItem === 'Client Master' || activeNavItem === 'Masters') && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
                    <h2 className="font-bold text-base text-gray-900">Commercial Client Master Directory</h2>
                    <p className="text-xs text-gray-500">Corporate shippers, mining consortia, agreed corridor freight tariffs, and billing contacts</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        name: 'African Mineral Logistics (Pty) Ltd',
                        accountCode: 'ACC-AML-01',
                        route: 'Kamativi Depot → Durban Port',
                        cargo: 'Tin Ore Concentrate (Flatbed)',
                        tariff: '$149.70 / Ton (USD)',
                        creditTerms: '30 Days Net',
                        contact: 'Farai Moyo (+263 77 412 8990)'
                      },
                      {
                        name: 'Zambezi Mining Supplies Ltd',
                        accountCode: 'ACC-ZMS-02',
                        route: 'Johannesburg Pomona → Chirundu / Lusaka',
                        cargo: 'Mining Heavy Equipment & Drill Bits',
                        tariff: '$5,400.00 / Trip Fixed Rate',
                        creditTerms: '30 Days Net',
                        contact: 'Anthony Mthembu (+260 96 882 1190)'
                      },
                      {
                        name: 'KCBE Trans Africa Logistics',
                        accountCode: 'ACC-KCBE-03',
                        route: 'Musina Bay → Pomona Depot',
                        cargo: 'Cross-Border Consolidation',
                        tariff: 'R68,500.00 / Corridor Run (ZAR)',
                        creditTerms: '14 Days Net',
                        contact: 'Brendan Smith (+27 82 555 0192)'
                      },
                      {
                        name: 'Anglo Platinum Consortia',
                        accountCode: 'ACC-APC-04',
                        route: 'Rustenburg → Beitbridge Border',
                        cargo: 'High-Value Platinum Matte',
                        tariff: '$180.00 / Ton (USD)',
                        creditTerms: '15 Days Net',
                        contact: 'Sipho Zulu (+27 11 880 2210)'
                      }
                    ].map((client, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div>
                              <h3 className="font-bold text-sm text-gray-900">{client.name}</h3>
                              <span className="text-[10px] text-indigo-600 font-mono font-bold">{client.accountCode}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active Shipper
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Primary Corridor:</span>
                              <strong className="text-gray-800">{client.route}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Cargo Type:</span>
                              <span className="text-gray-800">{client.cargo}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Agreed Tariff:</span>
                              <strong className="text-emerald-600 font-mono">{client.tariff}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Payment Terms:</span>
                              <span className="text-gray-800">{client.creditTerms}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-gray-100">
                              <span className="text-gray-400">Billing Contact:</span>
                              <span className="text-gray-800">{client.contact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 7b: GENERAL LEDGER MASTER (CHART OF ACCOUNTS)
                 ========================================================================= */}
              {activeNavItem === 'General Ledger Master' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-900">General Ledger Master — Chart of Accounts (COA)</h2>
                        <p className="text-xs text-gray-500">Double-entry accounting ledger with real-time fleet conversions in {activeCurrency}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      {(['All', 'Asset', 'Liability', 'Revenue', 'Expense'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setGlCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            glCategoryFilter === cat ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/90 text-gray-600 uppercase text-[10px] font-black tracking-wider border-b border-gray-200">
                            <th className="py-3 px-4">Account #</th>
                            <th className="py-3 px-4">Account Name</th>
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Balance ({activeCurrency})</th>
                            <th className="py-3 px-4">Ledger Operational Mapping</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {chartOfAccounts
                            .filter((acc) => glCategoryFilter === 'All' || acc.category === glCategoryFilter)
                            .filter((acc) => {
                              if (!searchQuery) return true;
                              const q = searchQuery.toLowerCase();
                              return acc.code.includes(q) || acc.name.toLowerCase().includes(q) || acc.note.toLowerCase().includes(q);
                            })
                            .map((acc) => (
                              <tr key={acc.code} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                                  {acc.code}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-gray-900">
                                  {acc.name}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    acc.category === 'Asset' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    acc.category === 'Liability' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                    acc.category === 'Revenue' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {acc.category}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                                  {acc.type}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-black text-gray-900 text-sm">
                                  {formatCurrency(convertCurrency(acc.balanceUSD, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                                </td>
                                <td className="py-3.5 px-4 text-gray-500">
                                  {acc.note}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 7c: FLEET COST CENTERS (VEHICLE ACCOUNTS & MARGINS)
                 ========================================================================= */}
              {activeNavItem === 'Fleet Cost Centers' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-900">Fleet Cost Centers & Vehicle Accounts</h2>
                        <p className="text-xs text-gray-500">Granular P&L contribution, diesel burn, driver imprest, and Cost Per Kilometer (CPK)</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                        Active Units: 2 SADC Superlinks
                      </span>
                    </div>
                  </div>

                  {/* 2 Fleet Cost Centers Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Unit 01: JRB 216MP */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div>
                            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Cost Center CC-001</span>
                            <h3 className="font-black text-base text-gray-900">Scania R500 (JRB 216MP)</h3>
                            <span className="text-xs text-gray-500">Flatbed Tri-Axle · Driver: Tichaona Mudzingwa</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active En Route
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Monthly Odo</span>
                            <span className="text-sm font-black text-gray-900 font-mono">4,820 km</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Fuel Burn</span>
                            <span className="text-sm font-black text-amber-600 font-mono">38.2 L/100km</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Cash Float</span>
                            <span className="text-sm font-black text-emerald-600 font-mono">${floatJRB} USD</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Est. CPK</span>
                            <span className="text-sm font-black text-indigo-600 font-mono">$0.98 / km</span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                          <div className="flex justify-between">
                            <span>Primary Freight Corridor:</span>
                            <strong className="text-gray-900">Kamativi Depot → Durban Port</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Assigned Revenue Share:</span>
                            <strong className="text-gray-900 font-mono">
                              +{formatCurrency(convertCurrency(grossRevenueUSD * 0.5, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Fuel & Lubricants:</span>
                            <span className="text-amber-600 font-mono">
                              -{formatCurrency(convertCurrency(totalFuelCostUSD * 0.48, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tolls & Border Clearances:</span>
                            <span className="text-rose-600 font-mono">
                              -{formatCurrency(convertCurrency(totalExpensesUSD * 0.52, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-100 font-bold text-gray-900">
                            <span>Unit Contribution Margin:</span>
                            <span className="text-emerald-600 font-mono font-black text-sm">
                              +{formatCurrency(convertCurrency(netOperatingProfitUSD * 0.5, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-mono">SARS Transit Reg #ZIM-9921</span>
                        {onOpenPettyCashModal && (
                          <button
                            onClick={() => onOpenPettyCashModal('JRB 216MP')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Top-Up Float
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Unit 02: KBR 813MP */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div>
                            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Cost Center CC-002</span>
                            <h3 className="font-black text-base text-gray-900">Freightliner Argosy (KBR 813MP)</h3>
                            <span className="text-xs text-gray-500">Dropside Superlink · Driver: Anthony Ndlovu</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active En Route
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Monthly Odo</span>
                            <span className="text-sm font-black text-gray-900 font-mono">5,260 km</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Fuel Burn</span>
                            <span className="text-sm font-black text-amber-600 font-mono">39.0 L/100km</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Cash Float</span>
                            <span className="text-sm font-black text-indigo-600 font-mono">R{floatKBR.toLocaleString()} ZAR</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-[10px] text-gray-400 font-semibold block">Est. CPK</span>
                            <span className="text-sm font-black text-indigo-600 font-mono">$1.02 / km</span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                          <div className="flex justify-between">
                            <span>Primary Freight Corridor:</span>
                            <strong className="text-gray-900">Johannesburg → Chirundu / Lusaka</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Assigned Revenue Share:</span>
                            <strong className="text-gray-900 font-mono">
                              +{formatCurrency(convertCurrency(grossRevenueUSD * 0.5, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Fuel & Lubricants:</span>
                            <span className="text-amber-600 font-mono">
                              -{formatCurrency(convertCurrency(totalFuelCostUSD * 0.52, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tolls & Border Clearances:</span>
                            <span className="text-rose-600 font-mono">
                              -{formatCurrency(convertCurrency(totalExpensesUSD * 0.48, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-100 font-bold text-gray-900">
                            <span>Unit Contribution Margin:</span>
                            <span className="text-emerald-600 font-mono font-black text-sm">
                              +{formatCurrency(convertCurrency(netOperatingProfitUSD * 0.5, 'USD', activeCurrency, exchangeRates), activeCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-mono">SARS Transit Reg #RSA-4412</span>
                        {onOpenPettyCashModal && (
                          <button
                            onClick={() => onOpenPettyCashModal('KBR 813MP')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Top-Up Float
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB CONTENT 8: TASKS DASHBOARD
                 ========================================================================= */}
              {activeNavItem === 'Tasks Dashboard' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-base text-gray-900">Accounting & Audit Tasks</h2>
                      <p className="text-xs text-gray-500">Comprehensive compliance checklist for cross-border logistics</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {filteredTasks.map((task) => (
                        <div key={task.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4 transition-colors">
                          <div className="flex items-center space-x-3">
                            <img
                              src={task.assignee.avatar}
                              alt={task.assignee.name}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                            />
                            <div>
                              <span className="font-bold text-xs text-gray-900 block leading-tight">{task.name}</span>
                              <div className="flex items-center space-x-2 mt-1 text-[11px] text-gray-500">
                                <span>{task.appWorkspace}</span>
                                <span>•</span>
                                <span className={task.isOverdue ? 'text-red-600 font-bold' : ''}>Due {task.dueBy}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              task.status === 'Open' ? 'bg-indigo-100 text-indigo-700' :
                              task.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                              task.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {task.status}
                            </span>
                            <button
                              onClick={() => {
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? { ...t, status: t.status === 'Completed' ? 'Open' : 'Completed' }
                                      : t
                                  )
                                );
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              {task.status === 'Completed' ? 'Reopen' : 'Mark Done'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Tax Invoice Modal */}
      {selectedTripForInvoice && (
        <TaxInvoiceModal
          isOpen={Boolean(selectedTripForInvoice)}
          onClose={() => setSelectedTripForInvoice(null)}
          trip={selectedTripForInvoice}
        />
      )}

      {/* Receipt Viewer Modal */}
      {selectedReceiptUrl && (
        <ReceiptViewerModal
          isOpen={Boolean(selectedReceiptUrl)}
          onClose={() => setSelectedReceiptUrl(null)}
          url={selectedReceiptUrl}
          title={receiptModalTitle}
        />
      )}
    </div>
  );
};
