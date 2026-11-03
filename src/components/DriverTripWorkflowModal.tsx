import React, { useState, useEffect } from 'react';
import { Trip, PreTripInspection, CollectionLog, DeliveryPOD, TripDelayOrIncident } from '../types';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDateOnly, extractTruckRegistration } from '../utils/helpers';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Truck,
  ShieldCheck,
  FileCheck2,
  Camera,
  Upload,
  Scale,
  Signature,
  FileText,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Phone,
  User,
  Coffee,
  Fuel,
  Receipt,
  Sparkles
} from 'lucide-react';

interface DriverTripWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onOpenFuelModal: (truckId?: string) => void;
  onOpenExpenseModal: (truckId?: string) => void;
}

type WorkflowStep = 'brief' | 'pretrip' | 'collection' | 'intransit' | 'pod';

export const DriverTripWorkflowModal: React.FC<DriverTripWorkflowModalProps> = ({
  isOpen,
  onClose,
  trip,
  onOpenFuelModal,
  onOpenExpenseModal
}) => {
  const { isDark } = useTheme();
  const { user, assignedTruck, assignedDriverName } = useAuth();
  const {
    trucks,
    savePreTripInspection,
    saveCollectionLog,
    saveDeliveryPOD,
    addTripDelayOrIncident,
    logDriverRestBreak
  } = useFleet();

  const truckReg = extractTruckRegistration(trip.truckId);
  // Find active truck object for odometer validation
  const currentTruck = trucks.find((t) => t.registration === truckReg);
  const minDepartureOdometer = currentTruck?.currentOdometer || currentTruck?.odometerKm || trip.departureOdometer || 480000;

  // Active step in the 5-step driver workflow
  const [activeStep, setActiveStep] = useState<WorkflowStep>(() => {
    if (trip.status === 'completed' || trip.deliveryPod) return 'pod';
    if (trip.collectionLog) return 'intransit';
    if (trip.preTripInspection) return 'collection';
    return 'brief';
  });

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // ----------------------------------------------------
  // STEP 2: Pre-Trip Inspection Form State
  // ----------------------------------------------------
  const [depOdo, setDepOdo] = useState<string>(
    String(trip.preTripInspection?.odometerDeparture || trip.departureOdometer || minDepartureOdometer)
  );
  const [depFuel, setDepFuel] = useState<number>(trip.preTripInspection?.fuelLevelDeparturePct || trip.departureFuelLevelPct || 95);
  const [tyresChecked, setTyresChecked] = useState(trip.preTripInspection?.tyresChecked ?? true);
  const [spareTyresChecked, setSpareTyresChecked] = useState(trip.preTripInspection?.spareTyresChecked ?? true);
  const [brakesChecked, setBrakesChecked] = useState(trip.preTripInspection?.brakesChecked ?? true);
  const [lightsChecked, setLightsChecked] = useState(trip.preTripInspection?.lightsAndIndicatorsChecked ?? true);
  const [fluidsChecked, setFluidsChecked] = useState(trip.preTripInspection?.fluidsChecked ?? true);
  const [wipersChecked, setWipersChecked] = useState(trip.preTripInspection?.wipersChecked ?? true);
  const [extinguisherChecked, setExtinguisherChecked] = useState(trip.preTripInspection?.fireExtinguisherPresent ?? true);
  const [warningTrianglesChecked, setWarningTrianglesChecked] = useState(trip.preTripInspection?.warningTriangles2xPresent ?? true);
  const [firstAidChecked, setFirstAidChecked] = useState(trip.preTripInspection?.firstAidKitPresent ?? true);
  const [restraintsChecked, setRestraintsChecked] = useState(trip.preTripInspection?.loadRestraintsChecked ?? true);

  // SA Legal & Document Verification
  const [cofValid, setCofValid] = useState(trip.preTripInspection?.cofValid ?? true);
  const [operatorCardValid, setOperatorCardValid] = useState(trip.preTripInspection?.operatorCardValid ?? true);
  const [licenceDiscValid, setLicenceDiscValid] = useState(trip.preTripInspection?.vehicleLicenceDiscValid ?? true);
  const [prdpValid, setPrdpValid] = useState(trip.preTripInspection?.prdpConfirmedValid ?? true);
  const [driverPrdpNumber, setDriverPrdpNumber] = useState(trip.preTripInspection?.driverPrdpNumber || 'PRDP-GP-2024-8841');
  const [driverSignature, setDriverSignature] = useState(
    trip.preTripInspection?.driverSignature || `${assignedDriverName || trip.driver || 'Driver'} [Verified]`
  );
  const [preTripNotes, setPreTripNotes] = useState(trip.preTripInspection?.notes || '');
  const [preTripError, setPreTripError] = useState<string | null>(null);

  // ----------------------------------------------------
  // STEP 3: Collection Form State
  // ----------------------------------------------------
  const [waybillNo, setWaybillNo] = useState(trip.collectionLog?.waybillNumber || 'AML-WB-77291');
  const [sealNo, setSealNo] = useState(trip.collectionLog?.sealNumber || 'SEAL-ZIM-884102');
  const [qtyLoaded, setQtyLoaded] = useState(String(trip.collectionLog?.quantityLoaded || `${trip.weightTons || 32} Tons / ${trip.palletCount || 24} Pallets`));
  const [conditionOnLoad, setConditionOnLoad] = useState<'clean' | 'intact' | 'damaged' | 'short_loaded'>(
    (trip.collectionLog?.conditionOnLoading as any) || 'intact'
  );
  const [waybillPhoto, setWaybillPhoto] = useState(
    trip.collectionLog?.waybillPhotoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  );
  const [collectionDetentionHours, setCollectionDetentionHours] = useState(String(trip.collectionLog?.detentionWaitingHours || '1.0'));
  const [shipperRep, setShipperRep] = useState(trip.collectionLog?.shipperRepresentative || trip.collectionContactPerson || 'Shipper Dispatch Manager');

  // Weighbridge Sub-Form
  const [wbTicketNo, setWbTicketNo] = useState(trip.collectionLog?.weighbridgeTicket?.ticketNumber || 'WB-KAM-0914');
  const [wbSteerKg, setWbSteerKg] = useState(String(trip.collectionLog?.weighbridgeTicket?.steerAxleKg || 6850));
  const [wbDriveKg, setWbDriveKg] = useState(String(trip.collectionLog?.weighbridgeTicket?.driveAxleGroupKg || 17200));
  const [wbTrailerKg, setWbTrailerKg] = useState(String(trip.collectionLog?.weighbridgeTicket?.trailerAxleGroupKg || 23800));
  const [wbTicketPhoto, setWbTicketPhoto] = useState(
    trip.collectionLog?.weighbridgeTicket?.ticketPhotoUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
  );
  const [collectionError, setCollectionError] = useState<string | null>(null);

  // ----------------------------------------------------
  // STEP 4: In-Transit Incidents & Delay State
  // ----------------------------------------------------
  const [incidentType, setIncidentType] = useState<'traffic' | 'breakdown' | 'border_queue' | 'toll_queue' | 'accident' | 'weighbridge_inspection'>('border_queue');
  const [incidentTitle, setIncidentTitle] = useState('Beitbridge Customs Clearance Hold');
  const [incidentDelayHours, setIncidentDelayHours] = useState('2.5');
  const [incidentLocation, setIncidentLocation] = useState('Beitbridge Border Commercial Gate');
  const [incidentDescription, setIncidentDescription] = useState('ZIMRA scanner queue inspection and document bond check.');
  const [incidentBillable, setIncidentBillable] = useState(true);

  // ----------------------------------------------------
  // STEP 5: Delivery & POD Form State
  // ----------------------------------------------------
  const [receiverName, setReceiverName] = useState(trip.deliveryPod?.receiverName || trip.deliveryContactPerson || 'Sipho Zulu (Port Logistics)');
  const [podSignature, setPodSignature] = useState(trip.deliveryPod?.receiverSignature || 'Sipho Zulu [Electronic Consignee Token]');
  const [stampPhotoUrl, setStampPhotoUrl] = useState(
    trip.deliveryPod?.companyStampPhotoUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
  );
  const [deliveredGoodsPhoto, setDeliveredGoodsPhoto] = useState(
    trip.deliveryPod?.deliveredGoodsPhotoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  );
  const [closingOdo, setClosingOdo] = useState(
    String(trip.deliveryPod?.odometerArrival || (trip.departureOdometer ? trip.departureOdometer + (trip.totalKm || 1680) : 483780))
  );
  const [palletsReturned, setPalletsReturned] = useState(String(trip.deliveryPod?.palletsOrEquipmentReturned || trip.palletCount || 24));
  const [deliveryDetention, setDeliveryDetention] = useState(String(trip.deliveryPod?.detentionHours || '0.5'));
  const [damageNotes, setDamageNotes] = useState(trip.deliveryPod?.damagesOrShortagesNotes || '');
  const [hasDiscrepancy, setHasDiscrepancy] = useState(trip.deliveryPod?.hasDiscrepancy || false);
  const [podError, setPodError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate live weighbridge GVM & overload indicator
  const steerNum = Number(wbSteerKg) || 0;
  const driveNum = Number(wbDriveKg) || 0;
  const trailerNum = Number(wbTrailerKg) || 0;
  const calculatedGvmKg = steerNum + driveNum + trailerNum;
  // South African legal Gross Combination Mass max limit is typically 56,000 kg (7-axle interlink) or 48,000 kg depending on axle config
  const isGvmOverloaded = calculatedGvmKg > 50000;
  const isDriveAxleOverloaded = driveNum > 18000; // max legal tandem drive axle in SA is 18,000 kg

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleSavePreTrip = async () => {
    setPreTripError(null);
    const parsedOdo = Number(depOdo);

    // Rule 2 validation: Odometer mandatory & must not be less than truck current odometer
    if (!parsedOdo || isNaN(parsedOdo)) {
      setPreTripError('RULE 2 ENFORCED: Departure odometer entry is strictly mandatory.');
      return;
    }
    if (parsedOdo < minDepartureOdometer) {
      setPreTripError(`Odometer error: Departure odometer (${parsedOdo} km) cannot be less than previous recorded reading (${minDepartureOdometer} km).`);
      return;
    }

    if (!warningTrianglesChecked) {
      setPreTripError('SA Road Traffic Act strictly mandates 2x valid warning triangles in vehicle.');
      return;
    }
    if (!extinguisherChecked) {
      setPreTripError('Valid fire extinguisher must be present in cab.');
      return;
    }
    if (!prdpValid) {
      setPreTripError('PrDP (Professional Driving Permit) must be valid for commercial freight transport.');
      return;
    }
    if (!driverSignature.trim()) {
      setPreTripError('Driver signature/verification token is required to sign off the trip.');
      return;
    }

    const inspection: PreTripInspection = {
      completedAt: new Date().toISOString(),
      driverName: assignedDriverName || trip.driver || 'Driver',
      driverPrdpNumber,
      driverSignature,
      odometerDeparture: parsedOdo,
      fuelLevelDeparturePct: depFuel,
      tyresChecked,
      spareTyresChecked,
      brakesChecked,
      lightsAndIndicatorsChecked: lightsChecked,
      fluidsChecked,
      wipersChecked,
      fireExtinguisherPresent: extinguisherChecked,
      warningTriangles2xPresent: warningTrianglesChecked,
      firstAidKitPresent: firstAidChecked,
      loadRestraintsChecked: restraintsChecked,
      cofValid,
      operatorCardValid,
      vehicleLicenceDiscValid: licenceDiscValid,
      insuranceOnBoard: true,
      prdpConfirmedValid: prdpValid,
      medicalCertificateValid: true,
      notes: preTripNotes.trim()
    };

    await savePreTripInspection(trip.id, truckReg, inspection);
    setFeedbackNotice('Pre-Trip Inspection Locked! Ready for Shipper Collection.');
    setActiveStep('collection');
  };

  const handleSaveCollection = async () => {
    setCollectionError(null);

    if (!waybillNo.trim()) {
      setCollectionError('Signed waybill or consignment note number is mandatory.');
      return;
    }
    if (!sealNo.trim()) {
      setCollectionError('Container / trailer seal number is required.');
      return;
    }
    if (!waybillPhoto) {
      setCollectionError('Photo of signed shipper waybill is required before departure.');
      return;
    }

    const log: CollectionLog = {
      capturedAt: new Date().toISOString(),
      waybillNumber: waybillNo.trim(),
      sealNumber: sealNo.trim(),
      quantityLoaded: qtyLoaded.trim(),
      conditionOnLoading: conditionOnLoad,
      waybillPhotoUrl: waybillPhoto,
      discrepancyNotes: conditionOnLoad !== 'intact' ? 'Shortage or damage noted at collection.' : '',
      weighbridgeTicket: {
        ticketNumber: wbTicketNo.trim(),
        date: new Date().toISOString().split('T')[0],
        steerAxleKg: steerNum,
        driveAxleGroupKg: driveNum,
        trailerAxleGroupKg: trailerNum,
        grossVehicleMassKg: calculatedGvmKg,
        isOverloaded: isGvmOverloaded || isDriveAxleOverloaded,
        ticketPhotoUrl: wbTicketPhoto
      },
      shipperRepresentative: shipperRep.trim(),
      shipperSignedWaybillPhotoUrl: waybillPhoto,
      arrivalShipperTime: new Date(Date.now() - 2 * 3600000).toISOString(),
      departureShipperTime: new Date().toISOString(),
      detentionWaitingHours: parseFloat(collectionDetentionHours) || 0
    };

    await saveCollectionLog(trip.id, log);
    setFeedbackNotice('Shipper Collection Verified! In-Transit Corridor Activated.');
    setActiveStep('intransit');
  };

  const handleAddIncident = async () => {
    if (!incidentTitle.trim()) return;

    await addTripDelayOrIncident(trip.id, {
      timestamp: new Date().toISOString(),
      type: incidentType,
      title: incidentTitle.trim(),
      description: incidentDescription.trim(),
      delayHours: parseFloat(incidentDelayHours) || 1,
      location: incidentLocation.trim(),
      isBillableToCustomer: incidentBillable
    });

    setIncidentTitle('');
    setIncidentDescription('');
    setFeedbackNotice('Incident / Delay logged to operational manifest.');
  };

  const handleSavePOD = async () => {
    setPodError(null);
    const parsedClosingOdo = Number(closingOdo);
    const departureOdo = trip.departureOdometer || trip.preTripInspection?.odometerDeparture || 0;

    // Rule 2 validation: Closing odometer must be >= departure odometer
    if (!parsedClosingOdo || isNaN(parsedClosingOdo)) {
      setPodError('RULE 2 ENFORCED: Final delivery odometer is strictly mandatory.');
      return;
    }
    if (departureOdo && parsedClosingOdo < departureOdo) {
      setPodError(`Closing odometer (${parsedClosingOdo} km) cannot be less than departure odometer (${departureOdo} km).`);
      return;
    }
    if (!receiverName.trim()) {
      setPodError('Receiver name is required for legal proof of delivery.');
      return;
    }
    if (!stampPhotoUrl) {
      setPodError('Company stamp photo is required to enable corporate accounting billing.');
      return;
    }

    const pod: DeliveryPOD = {
      capturedAt: new Date().toISOString(),
      receiverName: receiverName.trim(),
      receiverSignature: podSignature.trim(),
      companyStampPhotoUrl: stampPhotoUrl,
      deliveredGoodsPhotoUrl: deliveredGoodsPhoto,
      odometerArrival: parsedClosingOdo,
      arrivalConsigneeTime: new Date(Date.now() - 1.5 * 3600000).toISOString(),
      offloadCompleteTime: new Date().toISOString(),
      detentionHours: parseFloat(deliveryDetention) || 0,
      palletsOrEquipmentReturned: parseInt(palletsReturned) || 0,
      hasDiscrepancy,
      damagesOrShortagesNotes: hasDiscrepancy ? damageNotes : undefined
    };

    await saveDeliveryPOD(trip.id, truckReg, pod);
    setFeedbackNotice('Proof of Delivery (POD) Signed & Transmitted to Accounting!');
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className={`animate-modal-enter w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border flex flex-col max-h-[92vh] ${
        isDark ? 'bg-[#0A1125] border-[#1C2C54] text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Top Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-sky-400 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded">
                  {trip.tripReferenceNumber || trip.id}
                </span>
                <span className="text-xs font-bold text-slate-400">• Truck {truckReg}</span>
              </div>
              <h2 className="text-base font-black tracking-tight mt-0.5">
                Driver Trip Execution & Capture Console
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Visual Workflow Tab Bar */}
        <div className={`px-4 py-2.5 border-b overflow-x-auto shrink-0 flex items-center justify-between gap-1 text-xs font-bold ${
          isDark ? 'bg-[#080E20] border-[#162344]' : 'bg-slate-50 border-slate-200'
        }`}>
          {[
            { key: 'brief', label: '1. Dispatch Brief', done: true },
            { key: 'pretrip', label: '2. Pre-Trip Check', done: !!trip.preTripInspection },
            { key: 'collection', label: '3. Collection & WB', done: !!trip.collectionLog },
            { key: 'intransit', label: '4. In-Transit & HOS', done: trip.status === 'in_progress' },
            { key: 'pod', label: '5. Delivery & POD', done: !!trip.deliveryPod }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStep(tab.key as WorkflowStep)}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl text-center flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeStep === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : tab.done
                    ? isDark ? 'bg-[#0E1A38] text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/40' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.done && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Notice Banner */}
        {feedbackNotice && (
          <div className="px-5 py-2.5 bg-emerald-600/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
            <button onClick={() => setFeedbackNotice(null)} className="text-[11px] underline opacity-80 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto grow text-xs">

          {/* =========================================================================
              SCREEN 1: DISPATCH BRIEF (Read-Only for Driver)
             ========================================================================= */}
          {activeStep === 'brief' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-600/10 border border-blue-500/30 text-sky-200">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Admin Dispatch Instructions</span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {trip.customerName || 'African Mineral Logistics (Pty) Ltd'}
                  </h3>
                  <p className="text-xs text-sky-300 font-mono mt-0.5">
                    Account: {trip.customerAccountCode || 'ACC-AML-01'} • Customer PO: <strong>{trip.customerPoNumber || 'PO-ZIM-SA-88219'}</strong>
                  </p>
                </div>
                <div className="sm:text-right font-mono text-xs">
                  <span className="text-[10px] uppercase text-slate-400 block">Agreed Billing Rate</span>
                  <span className="text-base font-black text-emerald-400">
                    ${(typeof trip.agreedRate === 'object' ? trip.agreedRate?.rate : trip.agreedRate) || 149.70} / {(typeof trip.agreedRate === 'object' ? trip.agreedRate?.type : 'ton')}
                  </span>
                </div>
              </div>

              {/* Corridor Addresses & Windows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Collection Depot */}
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>Collection (Shipper)</span>
                  </div>
                  <h4 className="font-black text-sm text-white">{trip.origin}</h4>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {trip.collectionAddress || 'Kamativi Mine Depot Gate 3, Matabeleland North, Zimbabwe'}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Contact: {trip.collectionContactPerson || 'Farai Moyo (Dispatch Supt)'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phone: {trip.collectionPhone || '+263 77 412 8990'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Window: {trip.collectionWindowStart || '2026-10-20 07:00'} to {trip.collectionWindowEnd || '12:00'}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Depot */}
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-2 text-rose-400 font-bold mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>Delivery (Consignee)</span>
                  </div>
                  <h4 className="font-black text-sm text-white">{trip.destination}</h4>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {trip.deliveryAddress || 'Pier 2 Container Terminal, Bayhead Rd, Durban Port, 4057, South Africa'}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Contact: {trip.deliveryContactPerson || 'Sipho Zulu (Port Logistics)'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phone: {trip.deliveryPhone || '+27 82 555 0192'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Window: {trip.deliveryWindowStart || '2026-10-25 08:00'} to {trip.deliveryWindowEnd || '17:00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cargo & Handling Specs */}
              <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cargo & Load Specifications</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Commodity:</span>
                    <strong className="text-white">{trip.cargo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Weight:</span>
                    <strong className="text-sky-300">{trip.weightTons || 32.4} Metric Tons</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Pallet Count:</span>
                    <strong className="text-amber-300">{trip.palletCount || 24} Units</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dimensions / Trailer:</span>
                    <strong className="text-slate-200">{trip.dimensionsMeters || '13.6m Flatbed'}</strong>
                  </div>
                </div>
                {trip.specialInstructions && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs mt-2">
                    <strong>Handling Instructions:</strong> {trip.specialInstructions}
                  </div>
                )}
              </div>

              {/* SA Cross-Border Checklist Box */}
              {trip.isCrossBorder && (
                <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0C152E] border-[#1D2E5C]' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center space-x-2 text-sky-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>South Africa & SADC Cross-Border Compliance Manifest</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                      <span className="text-slate-400 block text-[10px]">Border Post & Agent:</span>
                      <strong className="text-white">{trip.borderPostName || 'Beitbridge (ZIM/SA)'}</strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{trip.clearingAgentName || 'BridgeLink Customs Forwarding'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                      <span className="text-slate-400 block text-[10px]">TIP & Customs SAD500:</span>
                      <strong className="text-emerald-400">{trip.tipNumber || 'TIP-BB-2026-9932'}</strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{trip.sad500Reference || 'SAD500-SA-901844'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                      <span className="text-slate-400 block text-[10px]">Permits on Board:</span>
                      <span className="text-emerald-300 font-bold block">✓ Cross-Border Operator Permit</span>
                      <span className="text-emerald-300 font-bold block text-[10px]">✓ COMESA Yellow Card Insurance</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveStep('pretrip')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <span>Proceed to Pre-Trip Inspection</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SCREEN 2: PRE-TRIP CHECK (What Driver Captures Before Departing)
             ========================================================================= */}
          {activeStep === 'pretrip' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div>
                  <h3 className="font-black text-sm text-white">Pre-Trip Depot Roadworthy & Document Sign-Off</h3>
                  <p className="text-[11px] text-slate-400">
                    Mandatory under SA National Road Traffic Act. Protects against roadside impoundment and operator liability.
                  </p>
                </div>
                {trip.preTripInspection && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    Pre-Trip Completed
                  </span>
                )}
              </div>

              {preTripError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center space-x-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{preTripError}</span>
                </div>
              )}

              {/* Odometer & Fuel Mandatory Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-[11px] font-black uppercase text-amber-400 tracking-wider mb-1">
                    Departure Odometer (km) * [RULE 2 MANDATORY]
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">Foundation for cost-per-km & fuel consumption calculations.</p>
                  <input
                    type="number"
                    value={depOdo}
                    onChange={(e) => setDepOdo(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-white font-mono font-black text-lg focus:outline-none focus:border-amber-400"
                    placeholder="e.g. 482100"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must be &ge; previous recorded reading ({minDepartureOdometer} km)
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-[11px] font-black uppercase text-sky-400 tracking-wider mb-1">
                    Fuel Tank Level at Departure ({depFuel}%)
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">Reconciled against depot bowser issues & fuel card charges.</p>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={depFuel}
                    onChange={(e) => setDepFuel(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>Empty / Reserve</span>
                    <span>50% Half</span>
                    <span>100% Full Tank</span>
                  </div>
                </div>
              </div>

              {/* 10-Point Mechanical & Safety Checklist */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="font-black text-xs uppercase text-slate-300 tracking-wider">
                  Vehicle Safety Checklist (SA Road Traffic Act Standard)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { label: 'Tyres & Tread Depth', val: tyresChecked, set: setTyresChecked },
                    { label: 'Spare Tyres (2x On Board)', val: spareTyresChecked, set: setSpareTyresChecked },
                    { label: 'Air Brakes & Pressure', val: brakesChecked, set: setBrakesChecked },
                    { label: 'Lights & Indicators', val: lightsChecked, set: setLightsChecked },
                    { label: 'Fluids (Oil / Coolant)', val: fluidsChecked, set: setFluidsChecked },
                    { label: 'Windscreen Wipers', val: wipersChecked, set: setWipersChecked },
                    { label: 'Fire Extinguisher (Valid)', val: extinguisherChecked, set: setExtinguisherChecked },
                    { label: '2x Warning Triangles (Mandatory)', val: warningTrianglesChecked, set: setWarningTrianglesChecked },
                    { label: 'First Aid Medical Kit', val: firstAidChecked, set: setFirstAidChecked },
                    { label: 'Load Restraints / Straps', val: restraintsChecked, set: setRestraintsChecked }
                  ].map((item, idx) => (
                    <label
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center space-x-2.5 cursor-pointer transition-colors ${
                        item.val
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={(e) => item.set(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold select-none">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SA Statutory Documents Verified on Board */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="font-black text-xs uppercase text-slate-300 tracking-wider">
                  Statutory Vehicle & Driver Documents on Board
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { label: 'Certificate of Fitness (COF) Current', val: cofValid, set: setCofValid },
                    { label: 'Operator Card Disc Displayed', val: operatorCardValid, set: setOperatorCardValid },
                    { label: 'Vehicle Licence Disc Valid', val: licenceDiscValid, set: setLicenceDiscValid },
                    { label: 'Driver PrDP (Professional Driving Permit) Valid', val: prdpValid, set: setPrdpValid }
                  ].map((item, idx) => (
                    <label
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center space-x-2.5 cursor-pointer ${
                        item.val
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={(e) => item.set(e.target.checked)}
                        className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold select-none">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">Driver PrDP Permit Number</label>
                    <input
                      type="text"
                      value={driverPrdpNumber}
                      onChange={(e) => setDriverPrdpNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      placeholder="PRDP-GP-2024-XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">Driver Electronic Acceptance Token *</label>
                    <input
                      type="text"
                      value={driverSignature}
                      onChange={(e) => setDriverSignature(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
                      placeholder="Driver full name"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setActiveStep('brief')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Back to Brief
                </button>
                <button
                  onClick={handleSavePreTrip}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lock Pre-Trip & Proceed</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SCREEN 3: COLLECTION (Driver Captures at Shipper Warehouse)
             ========================================================================= */}
          {activeStep === 'collection' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div>
                  <h3 className="font-black text-sm text-white">Shipper Collection & Consignment Waybill Capture</h3>
                  <p className="text-[11px] text-slate-400">
                    The warehouse signs this — photograph the signed waybill and capture axle weighbridge tickets.
                  </p>
                </div>
                {trip.collectionLog && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    Collection Confirmed
                  </span>
                )}
              </div>

              {collectionError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center space-x-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{collectionError}</span>
                </div>
              )}

              {/* Waybill & Seal Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 tracking-wider mb-1">
                    Waybill / Consignment No. *
                  </label>
                  <input
                    type="text"
                    value={waybillNo}
                    onChange={(e) => setWaybillNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    placeholder="AML-WB-77291"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 tracking-wider mb-1">
                    Security Seal Number *
                  </label>
                  <input
                    type="text"
                    value={sealNo}
                    onChange={(e) => setSealNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    placeholder="SEAL-ZIM-884102"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 tracking-wider mb-1">
                    Condition on Loading
                  </label>
                  <select
                    value={conditionOnLoad}
                    onChange={(e) => setConditionOnLoad(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="intact">Intact & Clean (No defects)</option>
                    <option value="damaged">Damage Observed & Photographed</option>
                    <option value="short_loaded">Short-Loaded by Shipper</option>
                  </select>
                </div>
              </div>

              {/* Waybill Photo Capture & Detention Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[11px] font-black uppercase text-sky-400 block tracking-wider mb-1">
                    Photo of Signed Consignment Note / Waybill *
                  </span>
                  <p className="text-[10px] text-slate-400 mb-2">Protects from shortfall disputes at destination.</p>
                  <div className="flex items-center space-x-3">
                    <img
                      src={waybillPhoto}
                      alt="Waybill Preview"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="space-y-1.5 grow">
                      <button
                        type="button"
                        onClick={() => {
                          // Allow photo update simulation
                          setWaybillPhoto('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80');
                          setFeedbackNotice('Signed waybill captured successfully.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snap / Upload Photo</span>
                      </button>
                      <span className="text-[10px] text-emerald-400 block font-mono">Verified Waybill Linked</span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[11px] font-black uppercase text-amber-400 block tracking-wider mb-1">
                    Loading Waiting / Detention Time (Hours)
                  </span>
                  <p className="text-[10px] text-slate-400 mb-2">Billable in contract if exceeding 2 free hours.</p>
                  <input
                    type="number"
                    step="0.5"
                    value={collectionDetentionHours}
                    onChange={(e) => setCollectionDetentionHours(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    placeholder="e.g. 1.2"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Shipper Rep: <strong>{shipperRep}</strong>
                  </span>
                </div>
              </div>

              {/* Weighbridge Tickets (Axle Group Weights) */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-black text-xs uppercase text-slate-300 tracking-wider">
                      Weighbridge Axle Group Verification (SA RTMC Regulations)
                    </h4>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isGvmOverloaded || isDriveAxleOverloaded
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isGvmOverloaded || isDriveAxleOverloaded ? 'OVERLOAD RISK' : 'LEGAL WITHIN AXLE LIMITS'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Steer Axle (kg)</label>
                    <input
                      type="number"
                      value={wbSteerKg}
                      onChange={(e) => setWbSteerKg(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Max legal: 7,700 kg</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Drive Tandem Axle (kg)</label>
                    <input
                      type="number"
                      value={wbDriveKg}
                      onChange={(e) => setWbDriveKg(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Max legal: 18,000 kg</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Trailer Tridem Axle (kg)</label>
                    <input
                      type="number"
                      value={wbTrailerKg}
                      onChange={(e) => setWbTrailerKg(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Max legal: 24,000 kg</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Gross Mass (GVM)</label>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sky-400 font-mono font-bold">
                      {calculatedGvmKg.toLocaleString()} kg
                    </div>
                    <span className="text-[9px] text-slate-400">Ticket: {wbTicketNo}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setActiveStep('pretrip')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Back to Pre-Trip
                </button>
                <button
                  onClick={handleSaveCollection}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Collection & Launch In-Transit</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SCREEN 4: IN-TRANSIT CORRIDOR (Driver Captures En Route)
             ========================================================================= */}
          {activeStep === 'intransit' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div>
                  <h3 className="font-black text-sm text-white">In-Transit Corridor & Incident Logger</h3>
                  <p className="text-[11px] text-slate-400">
                    Capture road diesel purchases, SANRAL tolls, and delays to defend contract demurrage claims.
                  </p>
                </div>
                <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live on Route</span>
                </span>
              </div>

              {/* Quick Tactile Action Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => onOpenFuelModal(truckReg)}
                  className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer transition-colors"
                >
                  <Fuel className="w-5 h-5 text-amber-400" />
                  <span className="font-black text-xs">Log Diesel Fill</span>
                  <span className="text-[10px] text-slate-400">Mandatory slip photo</span>
                </button>

                <button
                  onClick={() => onOpenExpenseModal(truckReg)}
                  className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer transition-colors"
                >
                  <Receipt className="w-5 h-5 text-rose-400" />
                  <span className="font-black text-xs">Log Toll / Fee</span>
                  <span className="text-[10px] text-slate-400">SANRAL or ZINARA</span>
                </button>

                <button
                  onClick={async () => {
                    await logDriverRestBreak(truckReg);
                    setFeedbackNotice('45-minute fatigue rest break recorded. Drive timer reset.');
                  }}
                  className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-sky-300 hover:bg-blue-500/25 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer transition-colors"
                >
                  <Coffee className="w-5 h-5 text-sky-400" />
                  <span className="font-black text-xs">45m Rest Break</span>
                  <span className="text-[10px] text-slate-400">HOS Fatigue reset</span>
                </button>

                <button
                  onClick={() => setActiveStep('pod')}
                  className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer transition-colors"
                >
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-black text-xs">Arrived Consignee</span>
                  <span className="text-[10px] text-slate-400">Sign POD at delivery</span>
                </button>
              </div>

              {/* Delay & Incident Logger Sub-Form */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="font-black text-xs uppercase text-slate-300 tracking-wider">
                  Log Delay or Route Incident (Traffic, Breakdown, Border Queue)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Incident Category</label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="border_queue">Border Gate Queue / Delay</option>
                      <option value="traffic">Traffic Congestion / Roadworks</option>
                      <option value="breakdown">Mechanical Breakdown / Tyre</option>
                      <option value="toll_queue">Toll Plaza Congestion</option>
                      <option value="weighbridge_inspection">Weighbridge Axle Audit Delay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Delay Duration (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={incidentDelayHours}
                      onChange={(e) => setIncidentDelayHours(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                      placeholder="e.g. 2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Corridor Location</label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      placeholder="e.g. Beitbridge Gate"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Incident Details & Explanation</label>
                  <textarea
                    rows={2}
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    placeholder="Describe reason for delay to defend customer penalties..."
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={incidentBillable}
                      onChange={(e) => setIncidentBillable(e.target.checked)}
                      className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-300 font-bold">Billable to customer as demurrage surcharge</span>
                  </label>

                  <button
                    onClick={handleAddIncident}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Save Incident Log
                  </button>
                </div>
              </div>

              {/* List of Delays Recorded for this trip */}
              {trip.delaysAndIncidents && trip.delaysAndIncidents.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Recorded Delays on this Trip ({trip.delaysAndIncidents.length})
                  </span>
                  {trip.delaysAndIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-white block">{inc.title}</strong>
                        <span className="text-slate-400 text-[11px]">{inc.description} • {inc.location}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        +{inc.delayHours}h Delay
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setActiveStep('collection')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Back to Collection
                </button>
                <button
                  onClick={() => setActiveStep('pod')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <span>Proceed to Final Delivery / POD</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SCREEN 5: DELIVERY / POD (The Money Document)
             ========================================================================= */}
          {activeStep === 'pod' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div>
                  <h3 className="font-black text-sm text-emerald-400">
                    Proof of Delivery (POD) — Consignee Acceptance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Without signed & stamped POD, accounting cannot legally invoice the customer.
                  </p>
                </div>
                {trip.deliveryPod && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    POD Sealed & Completed
                  </span>
                )}
              </div>

              {podError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center space-x-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{podError}</span>
                </div>
              )}

              {/* Receiver Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-[11px] font-black uppercase text-slate-300 tracking-wider mb-1">
                    Receiver Full Name & Title *
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold"
                    placeholder="e.g. Sipho Zulu (Durban Port Pier 2)"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Consignee Receiving Agent</span>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-[11px] font-black uppercase text-amber-400 tracking-wider mb-1">
                    Closing Odometer at Destination (km) * [RULE 2]
                  </label>
                  <input
                    type="number"
                    value={closingOdo}
                    onChange={(e) => setClosingOdo(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2 text-white font-mono font-black"
                    placeholder="e.g. 483780"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Departure was: {trip.departureOdometer || 482100} km (Total trip: {Number(closingOdo) - (trip.departureOdometer || 482100)} km)
                  </span>
                </div>
              </div>

              {/* Company Stamp & Receiver Signature Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[11px] font-black uppercase text-emerald-400 block tracking-wider mb-1">
                    Official Company Stamp Photo * (MANDATORY FOR SARS)
                  </span>
                  <p className="text-[10px] text-slate-400 mb-2">Corporate accounts reject invoices without stamp verification.</p>
                  <div className="flex items-center space-x-3">
                    <img
                      src={stampPhotoUrl}
                      alt="Company Stamp"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setStampPhotoUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80');
                          setFeedbackNotice('Official company stamp captured.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snap Stamp Photo</span>
                      </button>
                      <span className="text-[10px] text-emerald-400 block font-mono">Stamp Attached</span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[11px] font-black uppercase text-sky-400 block tracking-wider mb-1">
                    Photo of Delivered Goods in Position
                  </span>
                  <p className="text-[10px] text-slate-400 mb-2">Conclusive dispute protection against post-delivery damage claims.</p>
                  <div className="flex items-center space-x-3">
                    <img
                      src={deliveredGoodsPhoto}
                      alt="Delivered Goods"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveredGoodsPhoto('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80');
                          setFeedbackNotice('Delivered cargo photo captured.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snap Cargo Photo</span>
                      </button>
                      <span className="text-[10px] text-sky-400 block font-mono">Cargo Photo Attached</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discrepancies, Returns & Detention */}
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="font-black text-xs uppercase text-slate-300 tracking-wider">
                  Offload Times, Pallet Returns & Discrepancies
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Empty Pallets / Equipment Returned</label>
                    <input
                      type="number"
                      value={palletsReturned}
                      onChange={(e) => setPalletsReturned(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      placeholder="e.g. 24"
                    />
                    <span className="text-[9px] text-slate-400">Pallets have real financial value ($12 each).</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Offload Detention / Waiting Time (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={deliveryDetention}
                      onChange={(e) => setDeliveryDetention(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                      placeholder="e.g. 0.5"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDiscrepancy}
                      onChange={(e) => setHasDiscrepancy(e.target.checked)}
                      className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-300 font-bold">Any cargo damage, shortages, or delivery refusals?</span>
                  </label>
                  {hasDiscrepancy && (
                    <textarea
                      rows={2}
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-rose-500/50 rounded-lg p-2 text-white mt-2"
                      placeholder="Describe damaged bulk bags or quantity shortfall to calculate credit note..."
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setActiveStep('intransit')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Back to In-Transit
                </button>
                <button
                  onClick={handleSavePOD}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Transmit Signed POD to Accounting</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Status Bar */}
        <div className={`px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 ${
          isDark ? 'bg-[#0E1838] border-[#1C2C54]' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Rule 1: Receipts required for all costs • Rule 2: Validated odometers locked.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-650 text-white font-bold text-xs cursor-pointer"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
