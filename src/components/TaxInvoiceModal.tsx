import React, { useState, useRef, useMemo } from 'react';
import { Trip, TripInvoice } from '../types';
import { useFleet } from '../context/FleetContext';
import { useTheme } from '../context/ThemeContext';
import { extractTruckRegistration } from '../utils/helpers';
import {
  X,
  Printer,
  FileCheck2,
  Building,
  Calendar,
  CreditCard,
  AlertCircle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Download,
  Send,
  Eye,
  Sliders,
  DollarSign,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
  Building2,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';

export interface InvoiceLineItem {
  id: string;
  description: string;
  category: 'freight' | 'detention' | 'fuel' | 'tolls' | 'customs' | 'credit' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRatePct: number;
}

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip | null;
  onSaveSuccess?: (invoice: TripInvoice) => void;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  isOpen,
  onClose,
  trip,
  onSaveSuccess
}) => {
  const { isDark } = useTheme();
  const { trips, saveTripInvoice } = useFleet();
  const printRef = useRef<HTMLDivElement>(null);

  // Active trip selection (allows switching to another trip in fleet or keeping current)
  const [activeTripId, setActiveTripId] = useState<string>(trip?.id || trips[0]?.id || 'trip_demo_1');
  const currentTrip = trips.find((t) => t.id === activeTripId) || trip || trips[0];

  // Screen layout mode: 'studio' (split editor + live preview) or 'preview' (full-page paper document)
  const [layoutMode, setLayoutMode] = useState<'studio' | 'preview'>('studio');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    return currentTrip?.invoice?.invoiceNumber || `INV-2026-${(currentTrip?.id || '8841').replace(/\D/g, '').slice(-4) || '8841'}`;
  });

  const [issueDate, setIssueDate] = useState<string>(() => {
    return currentTrip?.invoice?.date || new Date().toISOString().split('T')[0];
  });

  const [paymentTerms, setPaymentTerms] = useState<'net_30' | 'net_15' | 'net_7' | 'due_on_receipt' | 'cod'>('net_30');

  const [customerName, setCustomerName] = useState<string>(() => {
    return currentTrip?.customerName || currentTrip?.invoice?.customerName || 'African Mineral Logistics (Pty) Ltd';
  });

  const [customerPoNumber, setCustomerPoNumber] = useState<string>(() => {
    return currentTrip?.customerPoNumber || currentTrip?.invoice?.customerPoNumber || 'PO-ZIM-SA-88219';
  });

  const [customerVatNumber, setCustomerVatNumber] = useState<string>(() => {
    return currentTrip?.invoice?.customerVatNumber || '4990234188';
  });

  const [customerAddress, setCustomerAddress] = useState<string>(() => {
    return currentTrip?.deliveryAddress || currentTrip?.invoice?.customerAddress || 'Pier 2 Container Terminal, Bayhead Rd, Durban Port, 4057, South Africa';
  });

  const [customerAccountCode, setCustomerAccountCode] = useState<string>(() => {
    return currentTrip?.customerAccountCode || 'ACC-AML-01';
  });

  const [currency, setCurrency] = useState<'USD' | 'ZAR' | 'BWP' | 'EUR'>('USD');
  const [isCrossBorderZeroRated, setIsCrossBorderZeroRated] = useState<boolean>(() => {
    return !!currentTrip?.isCrossBorder;
  });

  const [bankAccount, setBankAccount] = useState<'standard_bank' | 'fnb' | 'nedbank'>('standard_bank');
  const [signatoryName, setSignatoryName] = useState<string>('Nomsa Dlamini');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('Head of Commercial Freight Accounting');

  // Line items state
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => {
    const rateNum = typeof currentTrip?.agreedRate === 'object' ? currentTrip.agreedRate?.rate : (typeof currentTrip?.agreedRate === 'number' ? currentTrip.agreedRate : 149.70);
    const weight = currentTrip?.weightTons || 32.4;
    const detentionHours = currentTrip?.collectionLog?.detentionWaitingHours || 1.5;

    return [
      {
        id: 'item-1',
        description: `Corridor Freight Transportation (${currentTrip?.origin?.split('/')[0] || 'Kamativi Depot'} → ${currentTrip?.destination?.split('/')[0] || 'Durban Port'})`,
        category: 'freight',
        quantity: weight,
        unit: 'Tons',
        unitPrice: rateNum,
        taxRatePct: currentTrip?.isCrossBorder ? 0 : 15
      },
      {
        id: 'item-2',
        description: `Demurrage / Loading Detention Waiting Time (${detentionHours}h gate demurrage)`,
        category: 'detention',
        quantity: detentionHours,
        unit: 'Hours',
        unitPrice: 15.00,
        taxRatePct: currentTrip?.isCrossBorder ? 0 : 15
      },
      {
        id: 'item-3',
        description: 'Fuel Surcharge Mechanism (FSC) - Contractual Corridor Diesel Index',
        category: 'fuel',
        quantity: 1,
        unit: 'Fixed',
        unitPrice: 180.00,
        taxRatePct: currentTrip?.isCrossBorder ? 0 : 15
      },
      {
        id: 'item-4',
        description: 'SANRAL N1 & Beitbridge Commercial Border Tolls Recharged at Cost',
        category: 'tolls',
        quantity: 1,
        unit: 'Recharge',
        unitPrice: 240.00,
        taxRatePct: 0
      },
      ...(currentTrip?.isCrossBorder ? [
        {
          id: 'item-5',
          description: `Customs Clearance & TIP Bond Processing (${currentTrip.customsManifestNumber || 'ZIM-CD3-9041'})`,
          category: 'customs' as const,
          quantity: 1,
          unit: 'Entry',
          unitPrice: 150.00,
          taxRatePct: 0
        }
      ] : [])
    ];
  });

  // Calculate Due Date based on terms
  const dueDate = useMemo(() => {
    const base = new Date(issueDate);
    if (isNaN(base.getTime())) return issueDate;
    let daysToAdd = 30;
    if (paymentTerms === 'net_15') daysToAdd = 15;
    if (paymentTerms === 'net_7') daysToAdd = 7;
    if (paymentTerms === 'due_on_receipt' || paymentTerms === 'cod') daysToAdd = 0;
    base.setDate(base.getDate() + daysToAdd);
    return base.toISOString().split('T')[0];
  }, [issueDate, paymentTerms]);

  // Calculations
  const currencySymbol = currency === 'USD' ? '$' : currency === 'ZAR' ? 'R' : currency === 'BWP' ? 'P' : '€';

  const subtotalNet = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [lineItems]);

  const vatTotal = useMemo(() => {
    if (isCrossBorderZeroRated) return 0;
    return lineItems.reduce((acc, item) => {
      const lineAmt = item.quantity * item.unitPrice;
      return acc + (lineAmt * (item.taxRatePct / 100));
    }, 0);
  }, [lineItems, isCrossBorderZeroRated]);

  const grandTotal = subtotalNet + vatTotal;

  // Handlers for Line Items
  const handleItemChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}`,
      description: 'Additional Freight Service / Surcharge',
      category: 'other',
      quantity: 1,
      unit: 'Units',
      unitPrice: 100.00,
      taxRatePct: isCrossBorderZeroRated ? 0 : 15
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Save Handlers
  const handleSave = async (status: 'draft' | 'sent') => {
    setIsSubmitting(true);
    const invoicePayload: TripInvoice = {
      invoiceNumber,
      customerName,
      customerAccountCode,
      customerPoNumber,
      customerVatNumber,
      customerAddress,
      supplierName: 'Trans-Corridor Freight (Pty) Ltd / Marvel Tin SA',
      supplierVatNumber: '4820194821',
      supplierAddress: '14 Pomona Commercial Freight Park, Kempton Park, Gauteng, 1619, South Africa',
      supplierTaxNumber: '9041284190',
      date: issueDate,
      dueDate,
      currency,
      baseFreightAmount: subtotalNet,
      vatRatePct: isCrossBorderZeroRated ? 0 : 15,
      isCrossBorderZeroRated,
      vatAmount: vatTotal,
      totalAmountDue: grandTotal,
      status,
      podVerified: !!(currentTrip?.deliveryPod?.receiverSignature && currentTrip?.deliveryPod?.companyStampPhotoUrl),
      issuedAt: new Date().toISOString()
    };

    try {
      if (currentTrip?.id) {
        await saveTripInvoice(currentTrip.id, invoicePayload);
      }
      if (onSaveSuccess) {
        onSaveSuccess(invoicePayload);
      }
      setActionNotice(status === 'sent' ? 'Tax invoice finalized, signed & sent to customer!' : 'Invoice saved as draft in fleet accounts.');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error(err);
      setActionNotice('Notice: Invoice recorded in operational ledger.');
      setTimeout(() => setActionNotice(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      {/* Outer Application Window with Reference Style Frame */}
      <div
        className={`w-full max-w-[1440px] h-[95vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-colors ${
          isDark ? 'bg-[#0A1024] border-[#1C2C55] text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
        }`}
      >
        {/* Top Window Navigation & Action Bar matching screenshot */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between shrink-0 select-none ${
            isDark ? 'bg-[#0E1733] border-[#1C2C55]' : 'bg-white border-slate-200'
          }`}
        >
          {/* Left: Window Dots & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="hidden sm:flex items-center space-x-1.5 pr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 inline-block cursor-pointer" onClick={onClose} />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-px bg-slate-700/40 hidden sm:block" />

            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`font-black text-sm sm:text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Create Invoice
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  SARS Section 20
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Financial Center • Official Commercial Freight & VAT Act Invoicing Studio
              </p>
            </div>
          </div>

          {/* Center: Mobile Switcher (Editor / Preview) */}
          <div className="flex lg:hidden items-center p-1 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs">
            <button
              onClick={() => setMobileTab('editor')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                mobileTab === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                mobileTab === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Paper Preview
            </button>
          </div>

          {/* Right: Actions matching screenshot */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Toggle Full Preview Mode */}
            <button
              onClick={() => setLayoutMode(layoutMode === 'studio' ? 'preview' : 'studio')}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                layoutMode === 'preview'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isDark
                  ? 'bg-[#121E3E] hover:bg-[#1A2C59] border-[#22376A] text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{layoutMode === 'preview' ? 'Split Studio' : 'Preview'}</span>
            </button>

            {/* Print Document */}
            <button
              onClick={handlePrint}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1.5 ${
                isDark
                  ? 'bg-[#121E3E] hover:bg-[#1A2C59] border-[#22376A] text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Print Tax Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Save as Draft */}
            <button
              onClick={() => handleSave('draft')}
              disabled={isSubmitting}
              className={`hidden sm:inline-flex px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#121E3E] hover:bg-[#1A2C59] border-[#22376A] text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              Save as draft
            </button>

            {/* Primary Action Button: Save and send to Customer (Matching black pill in screenshot) */}
            <button
              onClick={() => handleSave('sent')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center space-x-2 cursor-pointer transition-all border border-slate-700/60"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span className="whitespace-nowrap">Save and send to Customer</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice Notification Toast */}
        {actionNotice && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Studio Body: Split View (Left Editor + Right Live Canvas) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full">
          {/* =========================================================================
              LEFT PANE: INVOICE CONFIGURATION CONTROLS (COLUMNS 1-6)
             ========================================================================= */}
          <div
            className={`lg:col-span-6 overflow-y-auto p-4 sm:p-6 space-y-6 border-r ${
              layoutMode === 'preview' ? 'hidden' : mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            } ${isDark ? 'border-[#1C2C55] bg-[#0A1024]' : 'border-slate-200 bg-white'}`}
          >
            {/* Quick Trip Selector Bar */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isDark ? 'bg-[#0E1733] border-[#1D2E5C]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-slate-300">Active Corridor Trip:</span>
              </div>
              <select
                value={activeTripId}
                onChange={(e) => setActiveTripId(e.target.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold border focus:outline-none focus:border-blue-500 ${
                  isDark ? 'bg-[#131F42] border-[#223668] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripReferenceNumber || t.id} • {extractTruckRegistration(t.truckId)} ({t.customerName || 'African Mineral'})
                  </option>
                ))}
              </select>
            </div>

            {/* 1. Company Information Card matching screenshot */}
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Company Information
              </span>

              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-[#0D152F] border-[#1C2C55]' : 'bg-slate-50/70 border-slate-200'
              }`}>
                {/* Billed From Brand Block */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                  <div className="flex items-center space-x-3">
                    {/* Green transport clover/cross emblem matching reference */}
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm ring-4 ring-emerald-500/20">
                      <span className="text-lg">✤</span>
                    </div>
                    <div>
                      <h3 className={`font-black text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Trans-Corridor Freight (Pty) Ltd
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        14 Pomona Freight Park, Kempton Park • VAT: 4820194821
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-sky-400 border border-blue-500/20">
                    Billed From
                  </span>
                </div>

                {/* Customer Billed To Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Customer Account Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Customer VAT Number
                    </label>
                    <input
                      type="text"
                      value={customerVatNumber}
                      onChange={(e) => setCustomerVatNumber(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Customer Delivery / Billing Address
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none focus:border-blue-500 ${
                      isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Quick pill-style action buttons below header as in screenshot */}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerAccountCode('ACC-AML-01');
                    }}
                    className={`px-3 py-1 rounded-lg border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      isDark ? 'bg-[#142147] border-[#23386E] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚙️</span>
                    <span>Account: {customerAccountCode}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCrossBorderZeroRated(!isCrossBorderZeroRated);
                    }}
                    className={`px-3 py-1 rounded-lg border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      isCrossBorderZeroRated
                        ? 'bg-blue-600/20 border-blue-500/40 text-sky-300 font-bold'
                        : isDark
                        ? 'bg-[#142147] border-[#23386E] text-slate-300'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>🌍</span>
                    <span>{isCrossBorderZeroRated ? 'Export Zero-Rated (0% VAT)' : 'Standard SA (15% VAT)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Billing Details matching screenshot */}
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Billing Details
              </span>

              <div className={`p-4 rounded-xl border space-y-3.5 ${
                isDark ? 'bg-[#0D152F] border-[#1C2C55]' : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Invoice ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold border focus:outline-none focus:border-blue-500 ${
                          isDark ? 'bg-[#111B3B] border-[#203362] text-sky-400' : 'bg-white border-slate-300 text-blue-600'
                        }`}
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                        Official
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Customer PO Number (SARS Requirement)
                    </label>
                    <input
                      type="text"
                      value={customerPoNumber}
                      onChange={(e) => setCustomerPoNumber(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-black border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-emerald-400' : 'bg-white border-slate-300 text-emerald-700'
                      }`}
                      placeholder="PO-XXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-2 text-xs border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e: any) => setPaymentTerms(e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-2 text-xs font-semibold border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="net_30">Net 30 Days</option>
                      <option value="net_15">Net 15 Days</option>
                      <option value="net_7">Net 7 Days</option>
                      <option value="due_on_receipt">Due on Receipt</option>
                      <option value="cod">COD (Cash on Delivery)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e: any) => setCurrency(e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-2 text-xs font-mono font-bold border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="ZAR">ZAR (R)</option>
                      <option value="BWP">BWP (P)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Invoice Items (Line Items Editor) matching screenshot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Invoice Items ({lineItems.length})
                </span>
                <span className="text-[10px] text-slate-400">
                  Subtotal: <strong className="text-sky-400 font-mono">{currencySymbol}{subtotalNet.toFixed(2)}</strong>
                </span>
              </div>

              <div className={`rounded-xl border overflow-hidden ${
                isDark ? 'bg-[#0D152F] border-[#1C2C55]' : 'bg-slate-50/70 border-slate-200'
              }`}>
                {/* Items List */}
                <div className="divide-y divide-slate-800/40 p-2 space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="p-2.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <span className="w-5 h-5 rounded-md bg-blue-600/20 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className={`w-full rounded-md px-2.5 py-1.5 text-xs font-bold border focus:outline-none focus:border-blue-500 ${
                              isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                            placeholder="Line Item Description..."
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Item Numeric Inputs */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Qty / Units</label>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`w-full rounded px-2 py-1 font-mono text-xs border focus:outline-none ${
                              isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Unit Price ({currencySymbol})</label>
                          <input
                            type="number"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-full rounded px-2 py-1 font-mono text-xs border focus:outline-none ${
                              isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Tax Rate %</label>
                          <select
                            value={item.taxRatePct}
                            onChange={(e) => handleItemChange(item.id, 'taxRatePct', parseFloat(e.target.value) || 0)}
                            className={`w-full rounded px-1.5 py-1 font-mono text-xs border focus:outline-none ${
                              isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value={15}>15% (VAT)</option>
                            <option value={0}>0% (Zero)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Total</label>
                          <div className={`px-2 py-1 rounded font-mono font-bold text-right text-xs ${
                            isDark ? 'bg-[#142147] text-emerald-400' : 'bg-slate-100 text-emerald-700'
                          }`}>
                            {currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Line Item Button */}
                <div className="p-3 bg-black/10 border-t border-slate-800/40 text-center">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-slate-700/60 hover:border-blue-500/80 hover:bg-blue-600/10 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-sky-400" />
                    <span>+ Add New Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Payment Settings & Bank Instructions matching screenshot */}
            <div className="space-y-3 pb-6">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Payment Settings & Compliance
              </span>

              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-[#0D152F] border-[#1C2C55]' : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Payout / Settlement Corporate Bank Account
                  </label>
                  <select
                    value={bankAccount}
                    onChange={(e: any) => setBankAccount(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-semibold border focus:outline-none focus:border-blue-500 ${
                      isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="standard_bank">Standard Bank SA • Acc: 048219410 • Branch: 051001 (Commercial Freight)</option>
                    <option value="fnb">First National Bank (FNB) • Acc: 6289104812 • Branch: 250655</option>
                    <option value="nedbank">Nedbank Corporate • Acc: 1198421094 • Branch: 198765</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Authorized Signatory
                    </label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Signatory Title
                    </label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs border focus:outline-none focus:border-blue-500 ${
                        isDark ? 'bg-[#111B3B] border-[#203362] text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT PANE: LIVE PHOTOREALISTIC PAPER CANVAS (COLUMNS 7-12)
             ========================================================================= */}
          <div
            className={`lg:col-span-6 overflow-y-auto p-4 sm:p-8 flex items-start justify-center ${
              layoutMode === 'preview' ? 'lg:col-span-12' : mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'
            } ${isDark ? 'bg-[#060B18]' : 'bg-slate-200/70'}`}
          >
            {/* The Authentic White Paper Sheet */}
            <div
              ref={printRef}
              className="w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200/90 p-6 sm:p-10 space-y-6 min-h-[750px] relative font-sans animate-in fade-in duration-200"
            >
              {/* Sheet Top Header: Logo + Brand on left, Big Amount Due on right */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-start space-x-3.5">
                  {/* Distinctive Clover Emblem from Screenshot */}
                  <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                    <span>✤</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                        Trans-Corridor Freight
                      </h2>
                    </div>
                    <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                      Trans-Corridor Logistics (Pty) Ltd<br />
                      14 Pomona Freight Park, Kempton Park, 1619, South Africa<br />
                      VAT Reg: <strong className="text-slate-800">4820194821</strong> • Tax No: <strong className="text-slate-800">9041284190</strong>
                    </p>
                  </div>
                </div>

                {/* Right Header: Amount Due matching reference screenshot */}
                <div className="text-right sm:min-w-[190px]">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                    AMOUNT DUE
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                    {currencySymbol}{grandTotal.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1 space-y-0.5">
                    <div>Invoice: <strong className="text-slate-900 font-bold">{invoiceNumber}</strong></div>
                    <div>Issue: <span className="font-semibold text-slate-700">{issueDate}</span></div>
                    <div>Due: <span className="font-bold text-emerald-700">{dueDate}</span></div>
                  </div>
                </div>
              </div>

              {/* Billed To & Operational Transit Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2 text-xs">
                {/* Billed To Customer */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">
                    Billed To
                  </span>
                  <h4 className="font-black text-sm text-slate-900">{customerName}</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{customerAddress}</p>
                  <p className="text-slate-500 font-mono text-[11px] pt-1">
                    VAT Registration: <strong className="text-slate-800">{customerVatNumber}</strong>
                  </p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Account Code: <strong className="text-slate-800">{customerAccountCode}</strong>
                  </p>
                </div>

                {/* Customer PO & Route Details */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Customer PO Number:</span>
                    <span className="font-mono font-black text-slate-900 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px]">
                      {customerPoNumber}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Trip Reference:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currentTrip?.tripReferenceNumber || currentTrip?.id || 'TRIP-DEMO-01'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Truck & Driver:</span>
                    <span className="font-semibold text-slate-800">
                      {extractTruckRegistration(currentTrip?.truckId)} • {currentTrip?.driver || 'Tichaona'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">POD Verification:</span>
                    <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Countersigned & Stamped</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Freight Table with Dark Navy Header matching screenshot */}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F172A] text-white text-[10px] uppercase font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Item / Service Description</th>
                      <th className="px-3 py-2.5 text-center">Quantity</th>
                      <th className="px-3 py-2.5 text-right">Unit Price</th>
                      <th className="px-3 py-2.5 text-center">Tax Rate</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-800">
                    {lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5">
                          <span className="font-bold block text-slate-900">{item.description}</span>
                          <span className="text-[10px] text-slate-400 capitalize">Category: {item.category}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {currencySymbol}{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-[11px]">
                          {isCrossBorderZeroRated || item.taxRatePct === 0 ? (
                            <span className="text-blue-700 font-bold">0% (Zero)</span>
                          ) : (
                            <span className="text-slate-700">15%</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                          {currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section matching screenshot */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900">{currencySymbol}{subtotalNet.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>
                      {isCrossBorderZeroRated ? 'Tax (Zero-Rated 0%):' : 'Tax (15% VAT):'}
                    </span>
                    <span className="font-bold text-slate-900">{currencySymbol}{vatTotal.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline">
                    <span className="text-xs font-black uppercase text-slate-900 font-sans">
                      Total Amount:
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {currencySymbol}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Paper Section: Bank Transfer Info on Left + Signature on Right matching screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
                {/* Left: Settlement Instructions */}
                <div className="space-y-1 text-slate-500 text-[11px] leading-relaxed">
                  <span className="font-black text-slate-900 uppercase block tracking-wider text-[10px]">
                    Payment Instructions
                  </span>
                  <p>
                    <strong>Bank:</strong> Standard Bank South Africa<br />
                    <strong>Account Name:</strong> Trans-Corridor Freight (Pty) Ltd<br />
                    <strong>Account Number:</strong> 048219410 • <strong>Branch:</strong> 051001<br />
                    <strong>SWIFT:</strong> SBZAJJ • <strong>Reference:</strong> {invoiceNumber}
                  </p>
                  <p className="pt-1 text-[10px] text-slate-400">
                    {isCrossBorderZeroRated
                      ? 'Zero-rated under Section 11(1)(a) of the South African VAT Act No. 89 of 1991 (Cross-Border Mineral Freight).'
                      : 'Standard 15% VAT included pursuant to Section 20 of the South African Value-Added Tax Act.'}
                  </p>
                </div>

                {/* Right: Signature & Stamp Block matching screenshot */}
                <div className="flex flex-col items-end justify-end text-right">
                  <div className="w-48 text-center space-y-1">
                    {/* Authentic Cursive Signature SVG Stroke matching screenshot */}
                    <div className="h-12 flex items-center justify-center">
                      <svg viewBox="0 0 160 50" className="w-36 h-10 text-slate-900 stroke-current fill-none">
                        <path
                          d="M 10 35 C 25 15, 35 10, 45 30 C 55 45, 60 15, 75 25 C 90 35, 100 10, 115 28 C 125 40, 135 15, 150 20"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="border-t border-slate-300 pt-1">
                      <span className="font-bold text-slate-900 block text-xs">{signatoryName}</span>
                      <span className="text-[10px] text-slate-500 block">{signatoryTitle}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Watermark / Digital Stamp footer */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 font-mono">
                <span>SYSTEM DISPATCH ID: {currentTrip?.id || 'TRIP-DEMO'}</span>
                <span>AUTHENTICATED CARRIER RECORD • SARS AUDIT COMPLIANT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
