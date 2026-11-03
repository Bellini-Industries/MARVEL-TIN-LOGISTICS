import React, { useState } from 'react';
import { X, FileText, Upload, Check, Image as ImageIcon, Zap, Loader2, Sparkles } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { uploadFleetDocument } from '../firebase';
import { compressImage, isImageFile, formatFileSize, CompressionResult } from '../utils/mediaOptimizer';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTruckId?: string;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({ isOpen, onClose, defaultTruckId }) => {
  const { addFileRecord } = useFleet();
  const { assignedTruck, isAdmin, user } = useAuth();
  const { isDark } = useTheme();

  const [truckId, setTruckId] = useState<string>(defaultTruckId || assignedTruck || 'JRB 216MP');
  const [fileName, setFileName] = useState<string>('Customs_Clearance_CD3_BillOfEntry.pdf');
  const [fileType, setFileType] = useState<string>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [storagePath, setStoragePath] = useState<string>('docs/customs/bill_of_entry_01.pdf');
  const [uploadedBy, setUploadedBy] = useState<string>(user?.displayName || 'Fleet Operations');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);

  if (!isOpen) return null;

  const documentPresets = [
    { name: 'Bill_of_Lading_Tin_Concentrate.pdf', type: 'pdf', path: 'docs/bol/bol_export.pdf' },
    { name: 'ZIMRA_Customs_Transit_Form_CD3.pdf', type: 'pdf', path: 'docs/customs/cd3.pdf' },
    { name: 'Goods_In_Transit_GIT_Insurance.pdf', type: 'pdf', path: 'docs/insurance/git_policy.pdf' },
    { name: 'Signed_Proof_Of_Delivery_POD.jpg', type: 'image/jpeg', path: 'docs/pod/pod_scan.jpg' },
    { name: 'Cross_Border_Road_Permit.pdf', type: 'pdf', path: 'docs/permits/cross_border.pdf' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileType(file.type || 'document');
    setStoragePath(`docs/${truckId.replace(/\s+/g, '_')}/${file.name}`);

    if (isImageFile(file)) {
      setCompressing(true);
      try {
        const result = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
        setSelectedFile(result.file);
        setPreviewUrl(result.dataUrl);
        setCompressionStats(result);
      } catch {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setCompressing(false);
      }
    } else {
      setSelectedFile(file);
      setCompressionStats(null);
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    setSubmitting(true);
    try {
      let finalUrl = previewUrl;

      if (selectedFile) {
        // Fast upload to storage with 4.5s timeout fallback
        finalUrl = await uploadFleetDocument(selectedFile, truckId);
      }

      await addFileRecord({
        fileName,
        downloadUrl: finalUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType,
        storagePath: storagePath || `docs/${truckId.replace(/\s+/g, '_')}/${fileName}`,
        linkedTo: truckId,
        uploadedBy: uploadedBy || user?.email || 'Operations Agent',
        timestamp: new Date()
      });
      onClose();
    } catch (err) {
      console.warn('Document record creation notice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className={`animate-modal-enter border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-colors ${
        isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5 text-cyan-500">
            <div className="p-2 rounded-xl bg-cyan-500/10">
              <FileText className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Upload Fleet Document
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Fast Media Compression & Cross-Border Document Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Truck Selection */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Link to Truck *
            </label>
            {isAdmin ? (
              <select
                value={truckId}
                onChange={(e) => setTruckId(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 font-medium border focus:outline-none focus:border-cyan-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="JRB 216MP">JRB 216MP (Driver: Tichaona)</option>
                <option value="KBR 813MP">KBR 813MP (Driver: Anthony)</option>
              </select>
            ) : (
              <div className={`w-full rounded-xl px-3.5 py-2.5 font-bold border ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
              }`}>
                {assignedTruck || truckId} (Assigned Truck)
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Common Document Types
            </label>
            <div className="flex flex-wrap gap-1.5">
              {documentPresets.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => {
                    setFileName(p.name);
                    setFileType(p.type);
                    setStoragePath(p.path);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  {p.name.replace(/_/g, ' ').replace('.pdf', '')}
                </button>
              ))}
            </div>
          </div>

          {/* File Picker with Fast Compression */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Select Local File (PDF or Image / POD scan)
            </label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-colors group ${
              isDark
                ? 'border-slate-700 hover:border-cyan-500 bg-slate-800/40 hover:bg-slate-800/80'
                : 'border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-cyan-50/50'
            }`}>
              <Upload className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {compressing ? 'Compressing & optimizing image...' : 'Click or tap to choose PDF, POD or scan file'}
              </span>
              <span className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Images auto-optimized client-side in &lt;100ms for instant upload
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Optimization Status Badge */}
            {compressing && (
              <div className="mt-2 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center space-x-2 text-cyan-400 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Optimizing high-resolution image for instant upload...</span>
              </div>
            )}

            {compressionStats && !compressing && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
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

            {/* Thumbnail Preview if Image */}
            {previewUrl && (
              <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-700 bg-black/40 max-h-36 flex items-center justify-center">
                <img src={previewUrl} alt="Document Preview" className="max-h-36 object-contain" />
                <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-emerald-400 px-2 py-0.5 rounded-md font-mono flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Ready for instant upload</span>
                </span>
              </div>
            )}
          </div>

          {/* File Name */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Document Title / File Name *
            </label>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Bill_of_Lading.pdf"
              className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:border-cyan-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Storage Path & Uploaded By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Storage Path
              </label>
              <input
                type="text"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
                placeholder="docs/category/filename.pdf"
                className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:border-cyan-500 text-xs font-mono ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Uploaded By
              </label>
              <input
                type="text"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="Name or Agent"
                className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:border-cyan-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className={`pt-4 border-t flex justify-end space-x-3 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || compressing}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/20 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Uploading...' : 'Save Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
