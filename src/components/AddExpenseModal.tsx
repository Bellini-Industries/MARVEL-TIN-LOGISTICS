import React, { useState, useEffect } from 'react';
import { ExpenseCategory, CurrencyCode } from '../types';
import {
  X,
  Receipt,
  Upload,
  DollarSign,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { uploadExpenseReceipt } from '../firebase';
import { extractTruckRegistration } from '../utils/helpers';
import { compressImage, isImageFile, formatFileSize, CompressionResult } from '../utils/mediaOptimizer';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruckId?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultTruckId,
}) => {
  const { addExpense, trips } = useFleet();
  const { assignedTruck, isAdmin } = useAuth();

  // 1. Truck selection
  const [truckId, setTruckId] = useState<string>(
    defaultTruckId || assignedTruck || 'JRB 216MP'
  );
  // 2. Trip selection
  const [tripId, setTripId] = useState<string>('');
  // 3. Category (dropdown: tollgate, seal, tracker, other)
  const [category, setCategory] = useState<ExpenseCategory>('tollgate');
  // 4. Description
  const [description, setDescription] = useState<string>(
    'Beitbridge Commercial Vehicle Tollgate Access'
  );
  // 5. Amount
  const [amount, setAmount] = useState<string>('150.00');
  // 6. Currency
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  // 7. PDF / Image receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
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

  // Filter trips for selected truck
  const relevantTrips = trips.filter(
    (t) => extractTruckRegistration(t.truckId) === truckId
  );

  const presetDescriptions: Record<ExpenseCategory, string[]> = {
    tollgate: [
      'Beitbridge Commercial Vehicle Tollgate Access',
      'ZINARA Norton / Kadoma Tollgate Plaza',
      'SANRAL N1 South Commercial Toll Plaza',
      'Chirundu Bridge Zambezi Transit Toll',
      'Plumtree Border Toll Plaza'
    ],
    seal: [
      'ZIMRA Customs Electronic Cargo Tracking Seal (ECTS)',
      'SARS High-Security Bolt Seal replacement',
      'ZRA Zambia Revenue Authority Container Transit Seal',
      'Tamper-evident cargo cable lock'
    ],
    tracker: [
      'Cross-Border Satellite Telemetry Certificate fee',
      'Beitbridge GPS Geofence Verification Inspection',
      'Asset satellite tracking ping verification'
    ],
    other: [
      'Port weighbridge axle load certification ticket',
      'Driver safe overnight parking secure bay fee',
      'Cross-border municipal freight transit permit',
      'Emergency roadside puncture inspection fee'
    ]
  };

  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setCategory(newCat);
    if (presetDescriptions[newCat]?.length > 0) {
      setDescription(presetDescriptions[newCat][0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Receipt file exceeds 25MB limit. Please upload a smaller receipt.');
      return;
    }

    setReceiptFileName(file.name);

    if (isImageFile(file)) {
      setCompressing(true);
      try {
        const comp = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
        setReceiptFile(comp.file);
        setPreviewThumbnail(comp.dataUrl);
        setCompressionStats(comp);
      } catch {
        setReceiptFile(file);
        setPreviewThumbnail(URL.createObjectURL(file));
      } finally {
        setCompressing(false);
      }
    } else {
      setReceiptFile(file);
      setPreviewThumbnail(null);
      setCompressionStats(null);
    }
  };

  /**
   * Helper to generate a realistic sample receipt PDF on the fly
   * so testers can immediately test uploading and downloading
   */
  const handleGenerateSampleReceipt = () => {
    setErrorMsg(null);
    const sanitizedReg = truckId.replace(/\s+/g, '_');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString();

    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 390 >>
stream
BT
/F1 18 Tf
50 720 Td
(MARVEL TIN S.A / ZIM - ROUTE EXPENSE RECEIPT) Tj
/F1 12 Tf
0 -35 Td
(Date: ${dateStr} ${timeStr}) Tj
0 -25 Td
(Truck: ${truckId}) Tj
0 -25 Td
(Category: ${category.toUpperCase()}) Tj
0 -25 Td
(Description: ${description}) Tj
0 -25 Td
(Amount: ${currency} ${amount}) Tj
0 -35 Td
(Corridor Verification: CROSS-BORDER TRANSIT APPROVED) Tj
0 -25 Td
(Receipt Reference: EXP-${Date.now().toString().slice(-6)}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000664 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
735
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const generatedFile = new File(
      [blob],
      `Expense_Receipt_${sanitizedReg}_${category}_${dateStr}.pdf`,
      { type: 'application/pdf' }
    );
    setReceiptFile(generatedFile);
    setReceiptFileName(generatedFile.name);
    setPreviewThumbnail(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedAmount = parseFloat(amount);
    if (!truckId) {
      setErrorMsg('Please select a truck.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter an expense description.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }
    if (!receiptFile) {
      setErrorMsg('RULE 1 ENFORCED: Every road expense requires a photo of the receipt — no photo, no reimbursement. Please attach receipt photo or click "Auto-Generate Tax Voucher".');
      return;
    }

    setUploading(true);

    try {
      let downloadUrl = '';

      if (receiptFile) {
        // Upload PDF or image receipt to Firebase Storage and get download URL
        downloadUrl = await uploadExpenseReceipt(receiptFile, truckId);
      }

      await addExpense({
        truckId,
        tripId: tripId || 'corridor_general',
        category,
        description: description.trim(),
        amount: parsedAmount,
        currency,
        receiptUrl: downloadUrl,
        timestamp: new Date(),
      });

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      setSuccessMsg(
        isOffline
          ? 'Expense saved to offline persistence! Automatically syncing when connected.'
          : 'Expense logged and receipt stored in Firebase Storage!'
      );

      setTimeout(() => {
        setReceiptFile(null);
        setReceiptFileName('');
        setPreviewThumbnail(null);
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Expense submission note:', err);
      setErrorMsg('Failed to save expense. Please check your network and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="animate-modal-enter bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-2.5 text-blue-400">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Log Route Expense</h3>
              <p className="text-[11px] text-slate-400">Per-trip costs & Firebase Storage receipt upload</p>
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

        {/* Scrollable Form Body - mobile accessible */}
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

          {/* 1. Truck Selection Dropdown */}
          <div>
            <label htmlFor="expense-truck" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Truck Selection *
            </label>
            <select
              id="expense-truck"
              value={truckId}
              onChange={(e) => {
                setTruckId(e.target.value);
                setTripId('');
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-semibold focus:outline-none focus:border-blue-500 text-sm"
              required
            >
              <option value="JRB 216MP">JRB 216MP — Scania R500 (Driver: Tichaona)</option>
              <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Driver: Anthony)</option>
            </select>
          </div>

          {/* 2. Trip Selection Dropdown */}
          <div>
            <label htmlFor="expense-trip" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Trip Selection
            </label>
            <select
              id="expense-trip"
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="">General Corridor Transit (No Specific Trip)</option>
              {relevantTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.origin.split(',')[0]} → {t.destination.split(',')[0]} ({t.status.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Category (Dropdown) */}
          <div>
            <label htmlFor="expense-category" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Expense Category * (Dropdown: tollgate, seal, tracker, other)
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-bold capitalize focus:outline-none focus:border-blue-500 text-sm cursor-pointer"
              required
            >
              <option value="tollgate">Tollgate — ZINARA, SANRAL & Border Plaza Tolls</option>
              <option value="seal">Seal — Customs ECTS & Security Cargo Bolt Seals</option>
              <option value="tracker">Tracker — Satellite Telemetry & Geofence Fees</option>
              <option value="other">Other — Weighbridge, Permits & Safe Parking</option>
            </select>

            {/* Category Quick Chips */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {(['tollgate', 'seal', 'tracker', 'other'] as ExpenseCategory[]).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`py-1.5 rounded-lg border text-xs font-bold capitalize transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <label htmlFor="expense-desc" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <input
              id="expense-desc"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Beitbridge Tollgate fee, ZIMRA ECTS Cargo Seal"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presetDescriptions[category]?.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDescription(preset)}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Amount & 6. Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="expense-amount" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="expense-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-3 text-white font-mono focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-currency" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Currency *
              </label>
              <select
                id="expense-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-mono font-bold focus:outline-none focus:border-blue-500 text-sm cursor-pointer"
                required
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="ZAR">ZAR (R - South African Rand)</option>
                <option value="BWP">BWP (P - Botswana Pula)</option>
                <option value="ZMW">ZMW (K - Zambian Kwacha)</option>
              </select>
            </div>
          </div>

          {/* 7. PDF / Image Receipt Upload (Firebase Storage) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                PDF or Image Receipt Upload (Firebase Storage)
              </label>
              <button
                type="button"
                onClick={handleGenerateSampleReceipt}
                className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                title="Generate an expense receipt slip PDF for immediate testing"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-generate Sample Receipt</span>
              </button>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-4 sm:p-5 bg-slate-800/40 hover:bg-slate-800/80 cursor-pointer transition-colors group">
              <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-400 mb-1.5 transition-colors" />
              <span className="text-xs font-bold text-white group-hover:text-blue-300">
                {receiptFileName ? 'Change Receipt File' : 'Upload Receipt (PDF or Image)'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 text-center">
                Supports PDF, PNG, JPG, WEBP (up to 25MB) • Downloadable later
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {compressing && (
              <div className="mt-2.5 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center space-x-2 text-blue-400 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Optimizing receipt image for instant upload...</span>
              </div>
            )}

            {compressionStats && !compressing && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Optimized: <strong>{formatFileSize(compressionStats.originalSize)}</strong> →{' '}
                    <strong>{formatFileSize(compressionStats.compressedSize)}</strong>{' '}
                    <span className="text-emerald-300 font-semibold">({compressionStats.compressionRatio}% smaller)</span>
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300/80 font-mono">
                  {compressionStats.durationMs}ms
                </span>
              </div>
            )}

            {receiptFileName && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs truncate">
                  {previewThumbnail ? (
                    <img
                      src={previewThumbnail}
                      alt="Thumbnail"
                      className="w-8 h-8 rounded-lg object-cover border border-slate-600 shrink-0"
                    />
                  ) : (
                    <FileCheck className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <span className="text-white font-medium truncate">{receiptFileName}</span>
                </div>
                <div className="flex items-center space-x-1 text-emerald-400 text-xs font-bold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{uploading ? 'Uploading Receipt & Saving...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
