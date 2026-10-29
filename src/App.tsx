import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FleetProvider, useFleet } from './context/FleetContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { FleetbaseSidebar } from './components/FleetbaseSidebar';
import { FleetbaseBoard } from './components/FleetbaseBoard';
import { DashboardOverview } from './components/DashboardOverview';
import { FleetMap } from './components/FleetMap';
import { TripsView } from './components/TripsView';
import { FuelLogsView } from './components/FuelLogsView';
import { ExpensesView } from './components/ExpensesView';
import { PettyCashView } from './components/PettyCashView';
import { MaintenanceView } from './components/MaintenanceView';
import { GenerateReportView } from './components/GenerateReportView';
import { FilesView } from './components/FilesView';
import { LoginScreen } from './components/LoginScreen';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileFAB } from './components/MobileFAB';

import { AddFuelLogModal } from './components/AddFuelLogModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddPettyCashModal } from './components/AddPettyCashModal';
import { AddMaintenanceModal } from './components/AddMaintenanceModal';
import { AddTripModal } from './components/AddTripModal';
import { UploadFileModal } from './components/UploadFileModal';
import { ProfitAndBorderView } from './components/ProfitAndBorderView';
import { CustomsDossierModal } from './components/CustomsDossierModal';
import { Trip } from './types';
import { Truck, X, Layers, MapPin, BarChart3, Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from './utils/useNetworkStatus';
import { DriverCabConsole } from './components/DriverCabConsole';
import { AccountingDashboardView } from './components/AccountingDashboardView';

const MainFleetApp: React.FC = () => {
  const {
    user,
    profile,
    currentRole,
    isAdmin,
    isAccountant,
    isDispatcher,
    isDriver,
    assignedTruck,
    assignedDriverName,
    loading: authLoading
  } = useAuth();
  const { loading: fleetLoading, filteredTrucks, updateTruckLocationAndPing } = useFleet();
  const { isDark, theme, toggleTheme } = useTheme();
  const network = useNetworkStatus();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'board' | 'map' | 'overview'>('board');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Modal triggers
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [pettyCashModalOpen, setPettyCashModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [targetTruckForModal, setTargetTruckForModal] = useState<string | undefined>(undefined);
  const [customsDossierTrip, setCustomsDossierTrip] = useState<Trip | null>(null);

  const openFuelWithTruck = (truckId?: string) => {
    setTargetTruckForModal(truckId);
    setFuelModalOpen(true);
  };

  const openExpenseWithTruck = (truckId?: string) => {
    setTargetTruckForModal(truckId);
    setExpenseModalOpen(true);
  };

  const openPettyCashWithTruck = (truckId?: string) => {
    setTargetTruckForModal(truckId);
    setPettyCashModalOpen(true);
  };

  const openMaintenanceWithTruck = (truckId?: string) => {
    setTargetTruckForModal(truckId);
    setMaintenanceModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 ${
        isDark ? 'bg-[#070D1E] text-slate-400' : 'bg-slate-100 text-slate-600'
      }`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl mb-4 ${
          isDark
            ? 'bg-[#0F1B3B] border border-blue-500/40 text-sky-400 shadow-blue-500/20'
            : 'bg-white border border-blue-200 text-blue-600 shadow-blue-500/10'
        }`}>
          <Truck className="w-7 h-7 animate-pulse" />
        </div>
        <p className={`text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>Connecting to MARVEL TIN Fleetbase...</p>
        <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Cross-Border Logistics Network</span>
      </div>
    );
  }

  // Secure Auth Gate: Prompt sign-in when unauthenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans selection:bg-blue-600 selection:text-white ${
      isDark ? 'bg-[#070D1E] text-slate-100' : 'bg-[#F1F5F9] text-slate-900'
    }`}>
      {/* Google Maps Quota Warning Banner per Section 8 of GMP skill */}
      {quotaExceeded && (
        <div className="bg-amber-900/80 border-b border-amber-600/60 text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-[2000] shadow-sm backdrop-blur-md">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-white hover:text-amber-100"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Header with Navigation, Telematics Ticker, Role Switcher and Mobile Drawer Trigger */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Driver View notice banner if logged in as Driver */}
      {!isAdmin && (
        <div className={`border-b px-4 py-2 transition-colors ${
          isDark ? 'bg-blue-950/60 border-blue-500/30' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`max-w-7xl mx-auto flex items-center justify-between text-xs font-medium ${
            isDark ? 'text-sky-200' : 'text-blue-900'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                <strong>Driver Telematics Active:</strong> Logged in for{' '}
                <span className={`font-bold underline ${isDark ? 'text-white' : 'text-blue-950'}`}>{assignedTruck}</span> (Driver: {assignedDriverName}).
              </span>
            </div>
            <span className={`text-[11px] font-mono ${isDark ? 'text-sky-400' : 'text-blue-700'}`}>
              Phone GPS Transmission Enabled
            </span>
          </div>
        </div>
      )}

      {/* Main Layout Body: Left Sidebar + Central Console Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar: Permanent on md and up */}
        <div className="hidden md:block shrink-0">
          <FleetbaseSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>

        {/* Mobile Slide-Over Sidebar Drawer */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-[1900] flex animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Slide-out Panel */}
            <div className={`relative flex-1 flex flex-col max-w-xs w-full shadow-2xl z-10 border-r transition-colors ${
              isDark ? 'bg-[#0a1124] border-[#19274a]' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 border-b flex items-center justify-between ${
                isDark ? 'border-[#19274a] bg-[#0e172e]' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`font-black text-xs tracking-wider block ${isDark ? 'text-white' : 'text-slate-900'}`}>MARVEL TIN</span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">FLEET-OPS</span>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'bg-[#14203d] hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <FleetbaseSidebar
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onCloseMobileDrawer={() => setSidebarOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Central Console Area with Fluid View Transitions */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 pb-28 md:pb-8 w-full">
          <div key={`${activeTab}_${viewMode}`} className="animate-view-enter max-w-7xl mx-auto space-y-4">
            {activeTab === 'dashboard' && (
              <>
                {isDriver ? (
                  <DriverCabConsole
                    onOpenFuelModal={openFuelWithTruck}
                    onOpenExpenseModal={openExpenseWithTruck}
                    onOpenPettyCashModal={openPettyCashWithTruck}
                    onOpenCustomsDossier={(trip) => setCustomsDossierTrip(trip)}
                  />
                ) : (
                  <>
                    {viewMode === 'board' && (
                      <FleetbaseBoard
                        onOpenTripModal={() => setTripModalOpen(true)}
                        onOpenCustomsDossier={(trip) => setCustomsDossierTrip(trip)}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                      />
                    )}

                {viewMode === 'map' && (
                  <div className="space-y-4">
                    {/* Top Bar Switcher */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-2xl p-4 text-xs transition-colors ${
                      isDark ? 'bg-[#171A23] border-white/5 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    }`}>
                      <div className="flex items-center space-x-2.5">
                        <span className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Corridor Telematics</span>
                        <span className="text-emerald-500 font-bold text-xs flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>2 Active GPS Beacons</span>
                        </span>
                      </div>

                      <div className={`flex items-center rounded-xl p-1 text-xs border ${
                        isDark ? 'bg-[#111319] border-white/5' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <button
                          onClick={() => setViewMode('board')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Orders Board</span>
                        </button>
                        <button
                          onClick={() => setViewMode('map')}
                          className="px-3 py-1.5 rounded-lg font-bold bg-blue-600 text-white shadow-md cursor-pointer flex items-center space-x-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Corridor Telemetry</span>
                        </button>
                        <button
                          onClick={() => setViewMode('overview')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Financial KPIs</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Corridor Map */}
                    <FleetMap
                      trucks={filteredTrucks}
                      onUpdateLocation={updateTruckLocationAndPing}
                      canEditLocation={true}
                    />
                  </div>
                )}

                {viewMode === 'overview' && (
                  <div className="space-y-4">
                    {/* Top Bar Switcher */}
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-2xl p-4 text-xs transition-colors ${
                      isDark ? 'bg-[#171A23] border-white/5 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    }`}>
                      <div className="flex items-center space-x-2.5">
                        <span className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Fleet Financials & Monthly KPIs</span>
                        <span className="text-sky-500 font-bold text-xs">
                          Monthly Summary
                        </span>
                      </div>

                      <div className={`flex items-center rounded-xl p-1 text-xs border ${
                        isDark ? 'bg-[#111319] border-white/5' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <button
                          onClick={() => setViewMode('board')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Orders Board</span>
                        </button>
                        <button
                          onClick={() => setViewMode('map')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Corridor Telemetry</span>
                        </button>
                        <button
                          onClick={() => setViewMode('overview')}
                          className="px-3 py-1.5 rounded-lg font-bold bg-blue-600 text-white shadow-md cursor-pointer flex items-center space-x-1.5"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Financial KPIs</span>
                        </button>
                      </div>
                    </div>

                    <DashboardOverview
                      onNavigateToReports={() => setActiveTab('reports')}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'accounting' && (
          <AccountingDashboardView />
        )}

            {activeTab === 'trips' && (
              <TripsView onOpenTripModal={() => setTripModalOpen(true)} />
            )}

            {activeTab === 'fuel' && (
              <FuelLogsView onOpenFuelModal={() => openFuelWithTruck()} />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView onOpenExpenseModal={() => openExpenseWithTruck()} />
            )}

            {activeTab === 'petty_cash' && (
              <PettyCashView onOpenPettyCashModal={() => openPettyCashWithTruck()} />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceView onOpenMaintenanceModal={() => openMaintenanceWithTruck()} />
            )}

            {activeTab === 'reports' && (
              <GenerateReportView />
            )}

            {activeTab === 'files' && (
              <FilesView onOpenFileModal={() => setFilesModalOpen(true)} />
            )}

            {(activeTab === 'profitability' || activeTab === 'borders') && (
              <ProfitAndBorderView
                onOpenCustomsDossier={(trip) => setCustomsDossierTrip(trip)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar: Android & field mobile responsive */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectTracking={() => {
          setActiveTab('dashboard');
          setViewMode('map');
        }}
      />

      {/* Mobile Floating Action Button (FAB) contextually rendered for active department screen */}
      <MobileFAB
        activeTab={activeTab}
        onOpenFuel={() => openFuelWithTruck()}
        onOpenExpense={() => openExpenseWithTruck()}
        onOpenPettyCash={() => openPettyCashWithTruck()}
        onOpenTrip={() => setTripModalOpen(true)}
        onOpenMaintenance={() => openMaintenanceWithTruck()}
        onOpenFile={() => setFilesModalOpen(true)}
      />

      {/* Action Modals */}
      <CustomsDossierModal
        isOpen={!!customsDossierTrip}
        onClose={() => setCustomsDossierTrip(null)}
        trip={customsDossierTrip}
      />

      <AddFuelLogModal
        isOpen={fuelModalOpen}
        onClose={() => setFuelModalOpen(false)}
        defaultTruckId={targetTruckForModal}
      />

      <AddExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        defaultTruckId={targetTruckForModal}
      />

      <AddPettyCashModal
        isOpen={pettyCashModalOpen}
        onClose={() => setPettyCashModalOpen(false)}
        defaultTruckId={targetTruckForModal}
      />

      <AddMaintenanceModal
        isOpen={maintenanceModalOpen}
        onClose={() => setMaintenanceModalOpen(false)}
        defaultTruckId={targetTruckForModal}
      />

      <AddTripModal
        isOpen={tripModalOpen}
        onClose={() => setTripModalOpen(false)}
        defaultTruckId={targetTruckForModal}
      />

      <UploadFileModal
        isOpen={filesModalOpen}
        onClose={() => setFilesModalOpen(false)}
        defaultTruckId={targetTruckForModal}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FleetProvider>
          <MainFleetApp />
        </FleetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
