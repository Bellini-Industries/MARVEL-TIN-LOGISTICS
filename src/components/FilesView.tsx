import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { useTheme } from '../context/ThemeContext';
import { FileRecord } from '../types';
import {
  formatDateTime,
  extractTruckRegistration
} from '../utils/helpers';
import {
  FileText,
  Plus,
  Download,
  ExternalLink,
  ShieldCheck,
  Truck,
  Eye,
  FileCheck
} from 'lucide-react';
import { ReceiptViewerModal } from './ReceiptViewerModal';

interface FilesViewProps {
  onOpenFileModal: () => void;
}

export const FilesView: React.FC<FilesViewProps> = ({ onOpenFileModal }) => {
  const { filteredFiles } = useFleet();
  const { isDark } = useTheme();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const getFileBadge = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">PDF</span>;
    }
    if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('png')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">IMG</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30 uppercase">DOC</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FileText className="w-5 h-5 text-cyan-500" />
            <span>Cross-Border Logistics Documents & POD Depot</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Bills of lading, ZIMRA/SARS customs clearance, road permits, and signed Proof of Delivery
          </p>
        </div>

        <button
          onClick={onOpenFileModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No documents linked</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Upload Bills of Lading, Customs Form CD3, Goods in Transit (GIT) insurance, or PODs.
          </p>
          <button
            onClick={onOpenFileModal}
            className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-xs"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const truckReg = extractTruckRegistration(file.linkedTo);
            const isJRB = truckReg.includes('JRB');

            return (
              <div
                key={file.id}
                className={`border rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-4 transition-colors backdrop-blur-sm ${
                  isDark
                    ? 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                    : 'bg-white border-slate-200 shadow-sm hover:border-cyan-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                        isJRB ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {truckReg || 'Fleet Unit'}
                    </span>
                    {getFileBadge(file.fileType)}
                  </div>

                  <h4 className={`text-sm font-bold line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`} title={file.fileName}>
                    {file.fileName}
                  </h4>

                  <div className={`text-[11px] font-mono mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={file.storagePath}>
                    {file.storagePath}
                  </div>
                </div>

                <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                  isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                  <div>
                    <span className="block text-[10px] text-slate-500">By {file.uploadedBy}</span>
                    <span>{formatDateTime(file.timestamp)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {file.downloadUrl && (
                      <button
                        onClick={() => {
                          setPreviewUrl(file.downloadUrl);
                          setPreviewTitle(file.fileName);
                        }}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300 transition-colors"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      <ReceiptViewerModal
        isOpen={Boolean(previewUrl)}
        onClose={() => setPreviewUrl(null)}
        url={previewUrl || ''}
        title={previewTitle}
      />
    </div>
  );
};
