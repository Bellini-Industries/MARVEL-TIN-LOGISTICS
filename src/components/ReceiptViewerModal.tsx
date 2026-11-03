import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  url,
  title = 'Document / Receipt Preview',
}) => {
  const { isDark } = useTheme();

  if (!isOpen || !url) return null;

  const isPdf = url.includes('.pdf') || url.startsWith('data:application/pdf');

  const handleDownload = () => {
    const ext = isPdf ? 'pdf' : 'jpg';
    const fileName = `Receipt_Document_${Date.now()}.${ext}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4">
      <div className={`animate-modal-enter border rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl transition-colors ${
        isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2 truncate max-w-[70%]">
            <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
            <h4 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              title="Download Receipt File"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Open raw file in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/70 min-h-[300px]">
          {isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <iframe
                src={url}
                title="PDF Receipt Viewer"
                className="w-full h-[65vh] rounded-2xl border border-slate-800 shadow-inner bg-slate-900"
              />
            </div>
          ) : (
            <img
              src={url}
              alt="Receipt Attachment"
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
            />
          )}
        </div>
      </div>
    </div>
  );
};
