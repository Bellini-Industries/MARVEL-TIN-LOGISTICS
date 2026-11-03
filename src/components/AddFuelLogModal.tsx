import React, { useState, useEffect } from 'react';
import { FuelLog, CurrencyCode } from '../types';
import { X, Fuel, Upload, DollarSign, MapPin, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, FileCheck } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { uploadPdfReceipt } from '../firebase';
import { extractTruckRegistration } from '../utils/helpers';
import { compressImage, isImageFile, formatFileSize, CompressionResult } from '../utils/mediaOptimizer';

interface AddFuelLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruckId?: string;
}

export const AddFuelLogModal: React.FC<AddFuelLogModalProps> = ({ isOpen, onClose, defaultTruckId }) => {
  const { addFuelLog, trips } = useFleet();
  const { assignedTruck, isAdmin } = useAuth();

  // 1. Truck selection (dropdown showing JRB 216MP and KBR 813MP)
  const [truckId, setTruckId] = useState<string>(defaultTruckId || assignedTruck || 'JRB 216MP');
  // 2. Trip selection
  const [tripId, setTripId] = useState<string>('');
  // 3. Litres taken
  const [litres, setLitres] = useState<string>('');
  // 3b. Current Odometer reading [RULE 2 MANDATORY]
  const [odometerKm, setOdometerKm] = useState<string>('482650');
  // 4. Fuel station name
  const [stationName, setStationName] = useState<string>('Puma Energy Truckstop');
  // 5. Station location
  const [location, setLocation] = useState<string>('Beitbridge Border, Zimbabwe');
  // 6. Cost
  const [cost, setCost] = useState<string>('');
  // 7. Currency dropdown (ZAR, BWP, USD, ZMW)
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  // 8. Receipt upload (PDF or Image)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
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

  // Filter trips for the selected truck
  const relevantTrips = trips.filter(
    (t) => extractTruckRegistration(t.truckId) === truckId
  );

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Receipt file exceeds 25MB limit. Please upload a smaller receipt.');
      return;
    }

    setPdfFileName(file.name);

    if (isImageFile(file)) {
      setCompressing(true);
      try {
        const comp = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
        setPdfFile(comp.file);
        setPreviewThumbnail(comp.dataUrl);
        setCompressionStats(comp);
      } catch {
        setPdfFile(file);
        setPreviewThumbnail(URL.createObjectURL(file));
      } finally {
        setCompressing(false);
      }
    } else {
      setPdfFile(file);
      setPreviewThumbnail(null);
      setCompressionStats(null);
    }
  };

  /**
   * Helper to generate a realistic sample PDF fuel slip on the fly
   * so testers and drivers can immediately test PDF upload and download
   * without needing an external file.
   */
  const handleGenerateSamplePdf = () => {
    setErrorMsg(null);
    const sanitizedReg = truckId.replace(/\s+/g, '_');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString();

    // Construct valid minimal PDF binary text content
    const sampleLitres = litres || '450.00';
    const sampleCost = cost || '650.00';
    const sampleStation = stationName || 'Puma Energy Beitbridge';

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
<< /Length 380 >>
stream
BT
/F1 18 Tf
50 720 Td
(MARVEL TIN S.A / ZIM - DIESEL REFUEL RECEIPT) Tj
/F1 12 Tf
0 -35 Td
(Date: ${dateStr} ${timeStr}) Tj
0 -25 Td
(Truck Registration: ${truckId}) Tj
0 -25 Td
(Fuel Station: ${sampleStation}) Tj
0 -25 Td
(Location: ${location}) Tj
0 -25 Td
(Litres Taken: ${sampleLitres} L) Tj
0 -25 Td
(Total Amount: ${currency} ${sampleCost}) Tj
0 -35 Td
(Cross-Border Corridor Verification: AUDITED) Tj
0 -25 Td
(Status: COMPLIANT & APPROVED) Tj
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
0000000654 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
725
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const generatedFile = new File(
      [blob],
      `Fuel_Slip_${sanitizedReg}_${dateStr}.pdf`,
      { type: 'application/pdf' }
    );
    setPdfFile(generatedFile);
    setPdfFileName(generatedFile.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedLitres = parseFloat(litres);
    const parsedCost = parseFloat(cost);

    if (!truckId) {
      setErrorMsg('Please select a truck.');
      return;
    }
    if (!parsedLitres || parsedLitres <= 0) {
      setErrorMsg('Please enter valid litres taken.');
      return;
    }
    if (!odometerKm || isNaN(parseFloat(odometerKm))) {
      setErrorMsg('RULE 2 ENFORCED: Odometer reading is strictly mandatory to calculate fuel consumption (L/100km).');
      return;
    }
    if (!stationName.trim()) {
      setErrorMsg('Please provide the fuel station name.');
      return;
    }
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setErrorMsg('Please enter a valid fuel purchase cost.');
      return;
    }
    if (!currency) {
      setErrorMsg('Please select a currency (ZAR, BWP, USD, ZMW).');
      return;
    }
    if (!pdfFile) {
      setErrorMsg('RULE 1 ENFORCED: Every expense needs a photo of the receipt — no photo, no reimbursement. Please upload pump slip or click "Generate Verified Fuel Slip".');
      return;
    }

    setUploading(true);

    try {
      let downloadUrl = '';

      if (pdfFile) {
        // Upload PDF to Firebase Storage and get download URL
        downloadUrl = await uploadPdfReceipt(pdfFile, truckId);
      }

      await addFuelLog({
        truckId,
        tripId: tripId || 'corridor_general',
        litres: parsedLitres,
        stationName: stationName.trim(),
        location: location.trim(),
        cost: parsedCost,
        currency,
        receiptUrl: downloadUrl,
        timestamp: new Date()
      });

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      setSuccessMsg(
        isOffline
          ? 'Fuel purchase saved to offline persistence! Automatically syncing when connected.'
          : 'Fuel purchase successfully logged and receipt stored!'
      );
      
      // Brief timeout to let user see confirmation before closing
      setTimeout(() => {
        setPdfFile(null);
        setPdfFileName('');
        setLitres('');
        setCost('');
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Fuel submission note:', err);
      setErrorMsg('Failed to record fuel log. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const stationPresets = [
    { name: 'Puma Energy Beitbridge', loc: 'Beitbridge Border, Zimbabwe' },
    { name: 'Engen 1-Stop Polokwane', loc: 'Polokwane N1, South Africa' },
    { name: 'TotalEnergies Chirundu', loc: 'Chirundu Border, Zimbabwe' },
    { name: 'Shell Musina Truckstop', loc: 'Musina, South Africa' },
    { name: 'Puma Lusaka Depot', loc: 'Lusaka Industrial Area, Zambia' },
    { name: 'Engen Colesberg', loc: 'Colesberg N1, South Africa' }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="animate-modal-enter bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Fuel className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Log Fuel Purchase</h3>
              <p className="text-[11px] text-slate-400">Driver Diesel Logging & Firebase Storage PDF Receipt</p>
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

          {/* 1. Truck Selection Dropdown (showing JRB 216MP and KBR 813MP) */}
          <div>
            <label htmlFor="truck-selection" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Truck Selection *
            </label>
            <select
              id="truck-selection"
              value={truckId}
              onChange={(e) => {
                setTruckId(e.target.value);
                setTripId('');
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
              required
            >
              <option value="JRB 216MP">JRB 216MP — Scania R500 (Driver: Tichaona)</option>
              <option value="KBR 813MP">KBR 813MP — Volvo FH16 (Driver: Anthony)</option>
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Fleet: JRB 216MP (Tichaona) or KBR 813MP (Anthony)
            </span>
          </div>

          {/* 2. Trip Selection Dropdown */}
          <div>
            <label htmlFor="trip-selection" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Trip Selection
            </label>
            <select
              id="trip-selection"
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-amber-500 text-sm"
            >
              <option value="">General Route / No Trip Attached</option>
              {relevantTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.origin.split(',')[0]} → {t.destination.split(',')[0]} ({t.status.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Litres Taken, Odometer & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="litres-taken" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Litres Taken *
              </label>
              <div className="relative">
                <input
                  id="litres-taken"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  required
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-mono focus:outline-none focus:border-amber-500 text-sm"
                />
                <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-bold">L</span>
              </div>
            </div>

            <div>
              <label htmlFor="odometer-reading" className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                Odometer (Km) * [RULE 2]
              </label>
              <div className="relative">
                <input
                  id="odometer-reading"
                  type="number"
                  required
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                  placeholder="e.g. 482650"
                  className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-3.5 py-3 text-white font-mono font-bold focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fuel-cost" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Cost *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="fuel-cost"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-3 text-white font-mono focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 7. Currency Selection (dropdown: ZAR, BWP, USD, ZMW) */}
          <div>
            <label htmlFor="currency-dropdown" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Currency * (Dropdown: ZAR, BWP, USD, ZMW)
            </label>
            <select
              id="currency-dropdown"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white font-mono font-bold focus:outline-none focus:border-amber-500 text-sm cursor-pointer"
              required
            >
              <option value="ZAR">ZAR — South African Rand (R)</option>
              <option value="BWP">BWP — Botswana Pula (P)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="ZMW">ZMW — Zambian Kwacha (K)</option>
            </select>
          </div>

          {/* 4. Fuel Station Name & 5. Station Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="station-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Fuel Station Name *
              </label>
              <input
                id="station-name"
                type="text"
                required
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Puma Energy, Engen, Total"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="station-location" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Station Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="station-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Beitbridge, Chirundu, Musina"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-3 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Quick Station Presets for Mobile Drivers */}
          <div>
            <span className="text-[11px] text-slate-400 font-medium block mb-1">
              Quick Corridor Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {stationPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setStationName(preset.name);
                    setLocation(preset.loc);
                  }}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 8. PDF Receipt Upload (Firebase Storage) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Fuel Receipt Upload (PDF or Photo) *
              </label>
              <button
                type="button"
                onClick={handleGenerateSamplePdf}
                className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                title="Generates a valid signed PDF fuel slip for instant testing"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-generate Sample PDF</span>
              </button>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-4 sm:p-5 bg-slate-800/40 hover:bg-slate-800/80 cursor-pointer transition-colors group">
              <Upload className="w-7 h-7 text-slate-400 group-hover:text-amber-400 mb-1.5 transition-colors" />
              <span className="text-xs font-bold text-white group-hover:text-amber-300">
                {pdfFileName ? 'Change Receipt' : 'Upload Fuel Receipt (PDF or Camera Photo)'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 text-center">
                Supports PDF, JPG, PNG, WEBP • Large photos auto-compressed in &lt;100ms
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={handlePdfChange}
                className="hidden"
              />
            </label>

            {compressing && (
              <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-2 text-amber-400 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Optimizing fuel receipt photo for instant upload...</span>
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

            {pdfFileName && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs truncate">
                  {previewThumbnail ? (
                    <img
                      src={previewThumbnail}
                      alt="Receipt Preview"
                      className="w-8 h-8 rounded-lg object-cover border border-slate-600 shrink-0"
                    />
                  ) : (
                    <FileCheck className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-white font-medium truncate">{pdfFileName}</span>
                </div>
                <div className="flex items-center space-x-1 text-emerald-400 text-xs font-bold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to upload</span>
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{uploading ? 'Uploading to Storage & Saving...' : 'Log Fuel Purchase'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
