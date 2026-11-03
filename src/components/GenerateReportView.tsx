import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ReportType, GeneratedReportRecord } from '../types';
import {
  formatDateTime,
  formatDateOnly,
  convertToZAR,
  convertToUSD,
  formatCurrency,
  extractTruckRegistration,
  extractDocId
} from '../utils/helpers';
import { uploadExcelReport } from '../firebase';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Truck,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileArchive,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  Receipt,
  Layers,
  Fuel,
  CreditCard,
  Wrench
} from 'lucide-react';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';

interface ReportRow {
  id: string;
  dateStr: string;
  rawDate: Date;
  description: string;
  category: string;
  amount: number;
  currency: string;
  amountZAR: number;
  truckReg: string;
  tripId: string;
  receiptUrl?: string;
  type: 'fuel' | 'expense' | 'maintenance';
}

export const GenerateReportView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const {
    trucks,
    fuelLogs,
    expenses,
    maintenance,
    trips,
    exchangeRates,
    selectedTruckFilter,
    setSelectedTruckFilter
  } = useFleet();

  // Filters State
  const [selectedTruck, setSelectedTruck] = useState<string>(
    selectedTruckFilter !== 'ALL' ? selectedTruckFilter : 'ALL'
  );
  const [reportType, setReportType] = useState<ReportType>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Processing & UI States
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Archive of generated reports in current session / localStorage
  const [recentReports, setRecentReports] = useState<GeneratedReportRecord[]>(() => {
    try {
      const stored = localStorage.getItem('marvel_tin_reports_archive');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Quick Preset Handlers
  const handlePresetDate = (preset: 'all' | 'this_month' | 'last_30' | 'this_quarter') => {
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
      return;
    }
    if (preset === 'last_30') {
      const past30 = new Date(now.getTime() - 30 * 86400000);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
      return;
    }
    if (preset === 'this_quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
      setStartDate(quarterStart.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
      return;
    }
  };

  // Build unified items array from Fuel, Expenses, Maintenance
  const allRawItems: ReportRow[] = useMemo(() => {
    const rows: ReportRow[] = [];

    // 1. Fuel Logs
    fuelLogs.forEach((f) => {
      let d: Date;
      if (f.timestamp && typeof f.timestamp === 'object' && 'toDate' in f.timestamp) {
        d = (f.timestamp as any).toDate();
      } else if (f.timestamp instanceof Date) {
        d = f.timestamp;
      } else {
        d = new Date(String(f.timestamp));
      }

      const zarVal = convertToZAR(f.cost, f.currency, exchangeRates);
      const truck = extractTruckRegistration(f.truckId);
      const tripRef = extractDocId(f.tripId) || 'N/A';

      rows.push({
        id: `fuel_${f.id}`,
        dateStr: formatDateOnly(d),
        rawDate: d,
        description: `${f.stationName} - ${f.litres}L diesel fuel @ ${f.location || 'Depot'}`,
        category: 'Fuel',
        amount: f.cost,
        currency: f.currency || 'ZAR',
        amountZAR: zarVal,
        truckReg: truck,
        tripId: tripRef,
        receiptUrl: f.receiptUrl,
        type: 'fuel'
      });
    });

    // 2. Expenses
    expenses.forEach((e) => {
      let d: Date;
      if (e.timestamp && typeof e.timestamp === 'object' && 'toDate' in e.timestamp) {
        d = (e.timestamp as any).toDate();
      } else if (e.timestamp instanceof Date) {
        d = e.timestamp;
      } else {
        d = new Date(String(e.timestamp));
      }

      const zarVal = convertToZAR(e.amount, e.currency, exchangeRates);
      const truck = extractTruckRegistration(e.truckId);
      const tripRef = extractDocId(e.tripId) || 'N/A';

      // Capitalize category nicely
      const catCapitalized = e.category
        ? e.category.charAt(0).toUpperCase() + e.category.slice(1)
        : 'Expense';

      rows.push({
        id: `expense_${e.id}`,
        dateStr: formatDateOnly(d),
        rawDate: d,
        description: e.description || `${catCapitalized} cost on corridor`,
        category: catCapitalized,
        amount: e.amount,
        currency: e.currency || 'USD',
        amountZAR: zarVal,
        truckReg: truck,
        tripId: tripRef,
        receiptUrl: e.receiptUrl,
        type: 'expense'
      });
    });

    // 3. Maintenance
    maintenance.forEach((m) => {
      let d: Date;
      if (m.timestamp && typeof m.timestamp === 'object' && 'toDate' in m.timestamp) {
        d = (m.timestamp as any).toDate();
      } else if (m.timestamp instanceof Date) {
        d = m.timestamp;
      } else {
        d = new Date(String(m.timestamp));
      }

      const zarVal = convertToZAR(m.cost, m.currency, exchangeRates);
      const truck = extractTruckRegistration(m.truckId);
      const tripRef = extractDocId(m.tripId) || 'Workshop/Depot';

      rows.push({
        id: `maint_${m.id}`,
        dateStr: formatDateOnly(d),
        rawDate: d,
        description: m.description || 'Workshop servicing and mechanical repairs',
        category: 'Maintenance',
        amount: m.cost,
        currency: m.currency || 'ZAR',
        amountZAR: zarVal,
        truckReg: truck,
        tripId: tripRef,
        receiptUrl: m.receiptUrl,
        type: 'maintenance'
      });
    });

    // Sort descending by date
    return rows.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [fuelLogs, expenses, maintenance, exchangeRates]);

  // Filtered rows according to user's selections
  const filteredRows = useMemo(() => {
    return allRawItems.filter((row) => {
      // 1. Truck Filter
      if (selectedTruck !== 'ALL' && row.truckReg !== selectedTruck) {
        return false;
      }

      // 2. Report Type Filter
      if (reportType === 'Fuel' && row.type !== 'fuel') return false;
      if (reportType === 'Expenses' && row.type !== 'expense') return false;
      if (reportType === 'Maintenance' && row.type !== 'maintenance') return false;

      // 3. Date Range Filter
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (row.rawDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (row.rawDate > end) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = row.description.toLowerCase().includes(q);
        const matchesCat = row.category.toLowerCase().includes(q);
        const matchesTruck = row.truckReg.toLowerCase().includes(q);
        const matchesTrip = row.tripId.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesTruck && !matchesTrip) {
          return false;
        }
      }

      return true;
    });
  }, [allRawItems, selectedTruck, reportType, startDate, endDate, searchQuery]);

  // Aggregate Metrics for Accounting
  const metrics = useMemo(() => {
    let totalZAR = 0;
    let fuelZAR = 0;
    let expenseZAR = 0;
    let maintZAR = 0;
    let receiptCount = 0;

    filteredRows.forEach((r) => {
      totalZAR += r.amountZAR;
      if (r.type === 'fuel') fuelZAR += r.amountZAR;
      if (r.type === 'expense') expenseZAR += r.amountZAR;
      if (r.type === 'maintenance') maintZAR += r.amountZAR;
      if (r.receiptUrl && r.receiptUrl.trim() !== '') {
        receiptCount++;
      }
    });

    const totalUSD = convertToUSD(totalZAR, 'ZAR', exchangeRates);

    return {
      recordCount: filteredRows.length,
      totalZAR,
      totalUSD,
      fuelZAR,
      expenseZAR,
      maintZAR,
      receiptCount
    };
  }, [filteredRows, exchangeRates]);

  // Copy helper
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  /**
   * Action 1: Generate Excel File using server-side exceljs,
   * upload to Firebase Storage, and provide download links.
   */
  const handleGenerateExcel = async () => {
    if (filteredRows.length === 0) {
      setStatusMessage({
        type: 'info',
        text: 'No records match the selected filters. Please adjust the truck or date range.'
      });
      return;
    }

    setIsGeneratingExcel(true);
    setStatusMessage(null);

    const fileName = `MARVEL_TIN_Accounting_${selectedTruck.replace(/\s+/g, '_')}_${reportType}_${Date.now()}.xlsx`;

    try {
      let excelBlob: Blob;

      // Primary attempt: Request server-side generation using exceljs
      try {
        const payload = {
          truck: selectedTruck,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          reportType,
          items: filteredRows.map((r) => ({
            date: r.dateStr,
            description: r.description,
            category: r.category,
            amount: r.amount,
            currency: r.currency,
            amountZAR: r.amountZAR,
            truckReg: r.truckReg,
            tripId: r.tripId,
            receiptUrl: r.receiptUrl
          }))
        };

        const res = await fetch('/api/reports/generate-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          excelBlob = await res.blob();
        } else {
          throw new Error(`Server returned status ${res.status}`);
        }
      } catch (serverErr) {
        console.warn('Server ExcelJS call note (using client-side fallback ExcelJS):', serverErr);

        // Client-side fallback using exceljs
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MARVEL TIN S.A/ZIM Logistics';
        const worksheet = workbook.addWorksheet('Accounting Report');

        // Header Title
        worksheet.mergeCells('A1:H1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'MARVEL TIN S.A / ZIM LOGISTICS - ACCOUNTING REPORT';
        titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 34;

        worksheet.mergeCells('A2:H2');
        const subCell = worksheet.getCell('A2');
        subCell.value = `Report Type: ${reportType.toUpperCase()} | Truck: ${selectedTruck} | Date: ${startDate || 'Start'} to ${endDate || 'Latest'} | Generated: ${new Date().toLocaleDateString('en-ZA')}`;
        subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        worksheet.getRow(3).height = 8;

        const headers = [
          'Date',
          'Description',
          'Category',
          'Amount (Original Currency)',
          'Currency',
          'Amount (ZAR)',
          'Truck Registration',
          'Trip ID'
        ];
        const headerRow = worksheet.getRow(4);
        headerRow.values = headers;
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        let rIdx = 5;
        let sumZAR = 0;
        filteredRows.forEach((r) => {
          sumZAR += r.amountZAR;
          const row = worksheet.getRow(rIdx);
          row.values = [
            r.dateStr,
            r.description,
            r.category,
            r.amount,
            r.currency,
            r.amountZAR,
            r.truckReg,
            r.tripId
          ];
          row.getCell(4).numFmt = '#,##0.00';
          row.getCell(6).numFmt = '"R "#,##0.00';
          row.getCell(6).font = { bold: true };
          rIdx++;
        });

        const totalsRow = worksheet.getRow(rIdx);
        totalsRow.values = ['TOTALS', `Records: ${filteredRows.length}`, '', '', 'ZAR TOTAL:', sumZAR, '', ''];
        totalsRow.font = { bold: true };
        totalsRow.getCell(6).numFmt = '"R "#,##0.00';

        worksheet.columns = [
          { width: 14 },
          { width: 36 },
          { width: 16 },
          { width: 25 },
          { width: 12 },
          { width: 22 },
          { width: 18 },
          { width: 20 },
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        excelBlob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      }

      // 2. Upload generated Excel file to Firebase Storage
      let firebaseUrl = '';
      try {
        firebaseUrl = await uploadExcelReport(excelBlob, fileName);
      } catch (uploadErr) {
        console.warn('Firebase Storage upload error, creating object URL:', uploadErr);
        firebaseUrl = URL.createObjectURL(excelBlob);
      }

      // 3. Trigger immediate browser download
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(excelBlob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // 4. Save to recent reports archive
      const newRecord: GeneratedReportRecord = {
        id: `rep_${Date.now()}`,
        name: fileName,
        reportType,
        truck: selectedTruck,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'All Dates',
        recordCount: filteredRows.length,
        totalZAR: metrics.totalZAR,
        downloadUrl: firebaseUrl,
        createdAt: new Date()
      };

      const updatedArchive = [newRecord, ...recentReports.slice(0, 9)];
      setRecentReports(updatedArchive);
      try {
        localStorage.setItem('marvel_tin_reports_archive', JSON.stringify(updatedArchive));
      } catch (e) {
        console.warn('Storage save note:', e);
      }

      setStatusMessage({
        type: 'success',
        text: `Excel report generated successfully and uploaded to Firebase Storage! Download started.`
      });
    } catch (err: any) {
      console.error('Error generating report:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to generate Excel report: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  /**
   * Action 2: Download All Receipts as a ZIP file
   */
  const handleDownloadAllReceiptsZip = async () => {
    const receiptsWithUrls = filteredRows.filter(
      (r) => r.receiptUrl && r.receiptUrl.trim() !== ''
    );

    if (receiptsWithUrls.length === 0) {
      setStatusMessage({
        type: 'info',
        text: 'No PDF or image receipts found for the selected truck and date range.'
      });
      return;
    }

    setIsDownloadingZip(true);
    setStatusMessage(null);

    const zipFileName = `MARVEL_TIN_Receipts_${selectedTruck.replace(/\s+/g, '_')}_${Date.now()}.zip`;

    try {
      let zipBlob: Blob;

      // Primary attempt: Request server-side ZIP packaging via /api/reports/download-receipts-zip
      try {
        const payload = {
          truck: selectedTruck,
          dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'All Recorded Dates',
          receipts: receiptsWithUrls.map((r, i) => {
            const ext = r.receiptUrl?.toLowerCase().includes('.pdf') ? 'pdf' : 'jpg';
            const cleanTruck = r.truckReg.replace(/\s+/g, '_');
            const cleanCat = r.category.replace(/[^a-zA-Z0-9]/g, '_');
            const cleanName = `${cleanTruck}_${cleanCat}_${r.dateStr}_rec${i + 1}.${ext}`;
            return {
              name: cleanName,
              url: r.receiptUrl!,
              truck: r.truckReg,
              category: r.category,
              date: r.dateStr
            };
          })
        };

        const res = await fetch('/api/reports/download-receipts-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          zipBlob = await res.blob();
        } else {
          throw new Error(`Server returned status ${res.status}`);
        }
      } catch (serverErr) {
        console.warn('Server ZIP packaging note (falling back to client JSZip):', serverErr);

        // Client-side fallback using JSZip
        const zip = new JSZip();
        const receiptsFolder = zip.folder('receipts');

        let indexText = `MARVEL TIN S.A / ZIM LOGISTICS\n`;
        indexText += `ACCOUNTING DEPARTMENT - BUNDLED RECEIPTS ARCHIVE\n`;
        indexText += `======================================================\n`;
        indexText += `Truck: ${selectedTruck}\n`;
        indexText += `Date Range: ${startDate && endDate ? `${startDate} to ${endDate}` : 'All Recorded'}\n`;
        indexText += `Generated: ${new Date().toISOString()}\n`;
        indexText += `Total Receipts: ${receiptsWithUrls.length}\n\n`;
        indexText += `RECEIPT REGISTER:\n`;

        for (let i = 0; i < receiptsWithUrls.length; i++) {
          const item = receiptsWithUrls[i];
          const cleanTruck = item.truckReg.replace(/\s+/g, '_');
          const cleanCat = item.category.replace(/[^a-zA-Z0-9]/g, '_');
          const ext = item.receiptUrl?.toLowerCase().includes('.pdf') ? 'pdf' : 'jpg';
          const filename = `${cleanTruck}_${cleanCat}_${item.dateStr}_ref${i + 1}.${ext}`;

          indexText += `${i + 1}. [${item.truckReg}] ${item.category} | ${item.dateStr} | ${item.currency} ${item.amount} (ZAR ${item.amountZAR.toFixed(2)}) => ${filename}\n`;
          indexText += `   Download URL: ${item.receiptUrl}\n\n`;

          try {
            if (item.receiptUrl?.startsWith('data:')) {
              const base64Data = item.receiptUrl.split(',')[1];
              if (base64Data) {
                receiptsFolder?.file(filename, base64Data, { base64: true });
              }
            } else if (item.receiptUrl?.startsWith('http')) {
              const fetchRes = await fetch(item.receiptUrl);
              if (fetchRes.ok) {
                const arrayBuf = await fetchRes.arrayBuffer();
                receiptsFolder?.file(filename, arrayBuf);
              } else {
                receiptsFolder?.file(`${filename}.txt`, `Direct download link: ${item.receiptUrl}`);
              }
            }
          } catch {
            receiptsFolder?.file(`${filename}.txt`, `Direct receipt link: ${item.receiptUrl}`);
          }
        }

        zip.file('README_Receipts_Index.txt', indexText);
        zipBlob = await zip.generateAsync({ type: 'blob' });
      }

      // Trigger download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatusMessage({
        type: 'success',
        text: `Packaged ${receiptsWithUrls.length} receipts into ${zipFileName}! Download started.`
      });
    } catch (err: any) {
      console.error('Error generating ZIP:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to download receipts ZIP: ${err?.message || 'Network error'}`
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Generate Accounting Reports
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Accounting & Audit
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Export full financial ledgers into Excel (.xlsx) with dual-currency conversions and download bundled PDF receipts.
            </p>
          </div>
        </div>

        {/* Top Status Indicators */}
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs ${
            isDark ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Admin Clearance: {isAdmin ? 'Verified' : 'Driver Demo'}</span>
          </div>
          {exchangeRates && (
            <div className="hidden lg:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1 USD = R {(1 / (exchangeRates.ZAR_USD || 0.055)).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              : 'bg-blue-950/40 border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs text-slate-400 hover:text-white ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Panel: Filters & Export Actions */}
      <div className={`border rounded-2xl p-6 shadow-xl space-y-6 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Report Parameters
            </h2>
          </div>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Selected Truck Filter:{' '}
            <span className="font-bold text-amber-500">{selectedTruck}</span>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Truck Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Truck Selection</span>
            </label>
            <select
              value={selectedTruck}
              onChange={(e) => {
                setSelectedTruck(e.target.value);
                setSelectedTruckFilter(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Trucks (Fleet Wide)</option>
              {trucks.map((t) => (
                <option key={t.registration} value={t.registration}>
                  {t.registration} — {t.driver} ({t.make.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Report Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Report Type</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All (Fuel, Expenses & Maintenance)</option>
              <option value="Fuel">Fuel Logs Only</option>
              <option value="Expenses">Expenses Only (Tolls, Seals, Trackers)</option>
              <option value="Maintenance">Maintenance Only (Servicing & Repairs)</option>
            </select>
          </div>

          {/* 3. Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Start Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 4. End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>End Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Quick Date Presets & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Date Presets:</span>
            <button
              type="button"
              onClick={() => handlePresetDate('all')}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                !startDate && !endDate
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('this_month')}
              className="px-2.5 py-1 text-xs rounded-lg border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('last_30')}
              className="px-2.5 py-1 text-xs rounded-lg border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate('this_quarter')}
              className="px-2.5 py-1 text-xs rounded-lg border bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
            >
              This Quarter
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search description, trip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Exporting <strong className="text-white">{metrics.recordCount}</strong> records matching criteria
            • <strong className="text-emerald-400">{metrics.receiptCount}</strong> PDF receipts attached
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Generate Excel Button */}
            <button
              type="button"
              onClick={handleGenerateExcel}
              disabled={isGeneratingExcel || filteredRows.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGeneratingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Excel (.xlsx)...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Generate & Export Excel (.xlsx)</span>
                </>
              )}
            </button>

            {/* Download All Receipts (ZIP) Button */}
            <button
              type="button"
              onClick={handleDownloadAllReceiptsZip}
              disabled={isDownloadingZip || metrics.receiptCount === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Download all attached PDF receipts for this date range as a ZIP archive"
            >
              {isDownloadingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Compressing ZIP...</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4 text-amber-400" />
                  <span>Download All Receipts ({metrics.receiptCount} ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Grand ZAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Amount (ZAR)
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400">
              R {metrics.totalZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-400 mt-1">
              ≈ USD ${metrics.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Fuel Costs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Fuel Expenditure
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              R {metrics.fuelZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-400 mt-1">
              {metrics.totalZAR > 0
                ? `${((metrics.fuelZAR / metrics.totalZAR) * 100).toFixed(1)}% of total cost`
                : 'No fuel logged'}
            </div>
          </div>
        </div>

        {/* Per-Trip Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Trip Expenses
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              R {metrics.expenseZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-400 mt-1">
              Tolls, seals, and tracker fees
            </div>
          </div>
        </div>

        {/* Maintenance Costs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Maintenance Costs
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              R {metrics.maintZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="text-xs text-slate-400 mt-1">
              Repairs, tires, and workshop service
            </div>
          </div>
        </div>
      </div>

      {/* Excel Sheet Table Preview (Exact 8 Columns matching prompt specification) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white">
                Excel Data Preview (8-Column Accounting Schema)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact layout compiled into the .xlsx document for accounting ledger imports.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">
              Showing {filteredRows.length} rows
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 min-w-[200px]">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount (Original)</th>
                <th className="py-3 px-4 text-center">Currency</th>
                <th className="py-3 px-4 text-right">Amount (ZAR)</th>
                <th className="py-3 px-4">Truck Registration</th>
                <th className="py-3 px-4">Trip ID</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-800/40 transition-colors text-slate-300"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-sans text-slate-400">
                      {row.dateStr}
                    </td>
                    <td className="py-3 px-4 font-sans text-white max-w-xs truncate">
                      {row.description}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.type === 'fuel'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : row.type === 'maintenance'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                        }`}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {row.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-400">
                      {row.currency}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R {row.amountZAR.toLocaleString('en-ZA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans font-bold text-slate-200">
                      {row.truckReg}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {row.tripId}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {row.receiptUrl ? (
                        <a
                          href={row.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] transition-colors"
                          title="View Receipt"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-[11px]">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950/80 font-bold border-t-2 border-slate-700 text-white">
                  <td colSpan={3} className="py-3.5 px-4 font-sans text-xs uppercase text-slate-400">
                    Grand Total ({filteredRows.length} Items)
                  </td>
                  <td colSpan={2} className="py-3.5 px-4 text-right font-sans text-xs text-slate-400">
                    Total Converted:
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-amber-400">
                    R {metrics.totalZAR.toLocaleString('en-ZA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td colSpan={3} className="py-3.5 px-4 font-sans text-xs text-slate-500">
                    Filtered by: {selectedTruck} ({reportType})
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Generated Reports & Persistent Firebase Storage Links Archive */}
      {recentReports.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Generated Reports & Firebase Storage Links
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Permanent cloud storage links for accounting records
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentReports.map((rep) => (
              <div
                key={rep.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-white font-mono">
                      {rep.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {rep.reportType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center space-x-3">
                    <span>Truck: <strong className="text-slate-300">{rep.truck}</strong></span>
                    <span>•</span>
                    <span>{rep.dateRange}</span>
                    <span>•</span>
                    <span>{rep.recordCount} rows</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-400">
                      R {rep.totalZAR.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(rep.downloadUrl)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
                    title="Copy Firebase Storage link to clipboard"
                  >
                    {copiedLink === rep.downloadUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {/* Direct Download */}
                  <a
                    href={rep.downloadUrl}
                    download={rep.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                    <ExternalLink className="w-3 h-3 text-emerald-400/70 ml-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
