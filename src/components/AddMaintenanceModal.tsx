import React, { useState, useEffect } from 'react';
import { CurrencyCode } from '../types';
import {
  X,
  Wrench,
  Upload,
  DollarSign,
  AlertTriangle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Route,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { uploadMaintenanceReceipt } from '../firebase';
import { extractTruckRegistration, formatCurrency, convertToUSD } from '../utils/helpers';
import { compressImage, isImageFile, formatFileSize, CompressionResult } from '../utils/mediaOptimizer';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruckId?: string;
}

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  isOpen,
  onClose,
  defaultTruckId
}) => {
  const { addMaintenance, updateTruckStatus, trips, exchangeRates } = useFleet();
  const { assignedTruck, isAdmin } = useAuth();

  // Form states
  const [truckId, setTruckId] = useState<string>(
    defaultTruckId || assignedTruck || 'JRB 216MP'
  );
  const [tripId, setTripId] = useState<string>('workshop_general');
  const [description, setDescription] = useState<string>(
    'Trailer air brake booster diaphragm replacement & tyre pressure alignment'
  );
  const [cost, setCost] = useState<string>('120.00');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
  const [setUnderMaintenance, setSetUnderMaintenance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState<boolean>(false);
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

  // Filter available trips for selected truck
  const relevantTrips = trips.filter(
    (t) => extractTruckRegistration(t.truckId) === extractTruckRegistration(truckId)
  );

  if (!isOpen) return null;

  const presets = [
    'Trailer air brake booster diaphragm overhaul & tyre pressure alignment',
    'Drive-axle tyre puncture vulcanizing & replacement (Michelin 315/80R22.5)',
    'Engine oil, lube grease & fuel filter 25,000km scheduled service',
    'Fifth-wheel kingpin locking jaw greasing & trailer coupling bushing',
    'Alternator drive-belt tension adjustment & starter battery terminal cleanup',
    'Suspension leaf-spring bushing replacement & axle torque alignment'
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Receipt file exceeds 25MB limit. Please upload a smaller receipt.');
      return;
    }

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
   * Helper to generate a realistic sample workshop job card PDF for testing
   */
  const handleGenerateSamplePdf = () => {
    setIsGeneratingSample(true);
    try {
      const invoiceNumber = `JC-${Math.floor(100000 + Math.random() * 900000)}`;
      const currentDate = new Date().toLocaleDateString('en-GB');

      // Create a valid PDF binary string
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Title (Workshop Job Card Receipt - ${truckId})
   /Author (Southern Cross Commercial Workshop)
   /Subject (Heavy Vehicle Maintenance Job Card)
   /Creator (Marvel Tin Fleet Maintenance)
   /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)})
>>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
5 0 obj
<< /Length 580 >>
stream
BT
/F1 18 Tf
50 740 Td
(SOUTHERN CROSS DIESEL & HYDRAULIC WORKSHOP) Tj
/F1 11 Tf
0 -24 Td
(Commercial Fleet Maintenance & Job Card Invoice) Tj
0 -18 Td
(Invoice No: ${invoiceNumber}  |  Date: ${currentDate}) Tj
0 -26 Td
(Truck Registration: ${truckId}) Tj
0 -18 Td
(Corridor Trip Ref: ${tripId === 'workshop_general' ? 'Scheduled Depot Servicing' : tripId}) Tj
0 -26 Td
(Description of Mechanical Work Done:) Tj
0 -16 Td
(${description.slice(0, 65)}) Tj
0 -26 Td
(Total Workshop Cost: ${currency} ${cost}) Tj
0 -22 Td
(Status: Completed & Road Safety Certified) Tj
0 -35 Td
(Signed Mechanic: Chief Diesel Technician, Harare Heavy Vehicle Depot) Tj
ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000195 00000 n 
0000000242 00000 n 
0000000301 00000 n 
0000000424 00000 n 
0000001056 00000 n 
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
1134
%%EOF`;

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const sampleFile = new File([blob], `JobCard_${truckId.replace(/\s+/g, '_')}_${Date.now()}.pdf`, {
        type: 'application/pdf',
      });

      setReceiptFile(sampleFile);
      setSuccessMsg('Sample workshop job card PDF generated and attached!');
      setErrorMsg(null);
    } catch (err: any) {
      console.warn('Sample PDF creation notice:', err);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedCost = parseFloat(cost);
    if (!description.trim()) {
      setErrorMsg('Please enter a description of work done.');
      return;
    }
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setErrorMsg('Please enter a valid maintenance cost amount.');
      return;
    }

    setSubmitting(true);
    try {
      let finalReceiptUrl = receiptUrl;

      // 1. Upload receipt to Firebase Storage if a file was selected
      if (receiptFile) {
        setSuccessMsg('Uploading PDF job card receipt to Firebase Storage...');
        finalReceiptUrl = await uploadMaintenanceReceipt(receiptFile, truckId);
      }

      // 2. Persist maintenance record
      await addMaintenance({
        truckId,
        tripId: tripId === 'workshop_general' ? '' : tripId,
        description: description.trim(),
        cost: parsedCost,
        currency,
        receiptUrl: finalReceiptUrl || '',
        timestamp: new Date()
      });

      // 3. Update truck mechanical status if toggled
      if (setUnderMaintenance) {
        await updateTruckStatus(truckId, 'maintenance');
      }

      setSuccessMsg('Maintenance job card logged successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Maintenance submission error:', err);
      setErrorMsg(err.message || 'Failed to save maintenance record. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10">
              <Wrench className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Log Maintenance & Repair</h3>
              <p className="text-[11px] text-slate-400">Mechanical Work Orders, Tyres, Servicing & Job Cards</p>
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

          {/* Truck Selection & Trip Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Truck Selection */}
            <div>
              <label htmlFor="maint-truck" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Truck Registration *
              </label>
              {isAdmin ? (
                <select
                  id="maint-truck"
                  value={truckId}
                  onChange={(e) => setTruckId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-rose-500 text-sm cursor-pointer"
                  required
                >
                  <option value="JRB 216MP">JRB 216MP — Scania R500 (Driver: Tichaona)</option>
                  <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Driver: Anthony)</option>
                </select>
              ) : (
                <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-rose-300 font-bold text-sm">
                  {assignedTruck || truckId} (Assigned Truck)
                </div>
              )}
            </div>

            {/* Trip Selection */}
            <div>
              <label htmlFor="maint-trip" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Linked Trip *
              </label>
              <div className="relative">
                <Route className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  id="maint-trip"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-rose-500 text-sm cursor-pointer"
                >
                  <option value="workshop_general">General Depot Servicing (No Active Trip)</option>
                  {relevantTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.origin} ➔ {trip.destination} ({trip.status.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description of Work Done */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="maint-desc" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Description of Work Done *
              </label>
              <span className="text-[10px] text-slate-500">Pick preset or type custom</span>
            </div>
            <textarea
              id="maint-desc"
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Brake booster overhaul, drive-axle tyre replacement, oil and lube 20,000km service..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm resize-none"
            />

            {/* Southern African workshop presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.slice(0, 4).map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDescription(p)}
                  className="text-[10px] bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded-lg px-2 py-1 transition-colors text-left"
                >
                  + {p.split('(')[0].trim().slice(0, 36)}...
                </button>
              ))}
            </div>
          </div>

          {/* Cost and Currency Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="maint-cost" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Maintenance Cost *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  id="maint-cost"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="maint-currency" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Currency *
              </label>
              <select
                id="maint-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-rose-500 text-sm cursor-pointer"
                required
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="ZAR">ZAR (R - South African Rand)</option>
                <option value="BWP">BWP (P - Botswana Pula)</option>
                <option value="ZMW">ZMW (K - Zambian Kwacha)</option>
              </select>
            </div>
          </div>

          {/* Receipt Upload using Firebase Storage */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Job Card / Receipt Upload (PDF or Photo) *
              </label>
              <button
                type="button"
                onClick={handleGenerateSamplePdf}
                disabled={isGeneratingSample}
                className="inline-flex items-center space-x-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-generate Sample PDF</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-rose-500/60 rounded-2xl p-4 text-center transition-colors bg-slate-800/40 relative">
              <input
                type="file"
                accept="application/pdf,.pdf,image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="maintenance-receipt-upload"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                {receiptFile ? (
                  <div className="flex items-center space-x-2.5 text-rose-400">
                    {previewThumbnail ? (
                      <img
                        src={previewThumbnail}
                        alt="Job Card Thumbnail"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-600 shrink-0"
                      />
                    ) : (
                      <FileCheck className="w-6 h-6 shrink-0" />
                    )}
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block truncate max-w-xs">
                        {receiptFile.name}
                      </span>
                      <span className="text-[10px] text-rose-400">
                        {formatFileSize(receiptFile.size)} • Optimized for fast upload
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-2.5 rounded-full bg-slate-800 text-rose-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      <span className="text-rose-400 font-bold">Click to choose PDF or Photo</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      PDF invoices, job cards & workshop photos • Auto-compressed in &lt;100ms
                    </p>
                  </>
                )}
              </div>
            </div>

            {compressing && (
              <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-rose-400 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Optimizing maintenance invoice photo for instant upload...</span>
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
          </div>

          {/* Under Maintenance Status Checkbox */}
          <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Flag Truck as "In Workshop"
                </span>
                <span className="text-[10px] text-slate-400">
                  Update truck status to maintenance during active repairs
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={setUnderMaintenance}
              onChange={(e) => setSetUnderMaintenance(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-slate-700 bg-slate-800 cursor-pointer"
            />
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="pt-2 flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-600/20 cursor-pointer flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Job Card...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>Log Maintenance & Save Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
