import { Timestamp, GeoPoint, DocumentReference } from 'firebase/firestore';

export type TruckStatus = 'active' | 'maintenance' | 'inactive' | 'idle';
export type TripStatus = 'in_progress' | 'completed' | 'cancelled';
export type ExpenseCategory = 'tollgate' | 'seal' | 'tracker' | 'other';
export type PettyCashType = 'top_up' | 'expense_deduction';
export type CurrencyCode = 'USD' | 'ZAR' | 'BWP' | 'ZMW';
export type BorderCheckpoint = 'Beitbridge' | 'Chirundu' | 'Plumtree' | 'Forbes' | 'Groblersbridge' | 'None';
export type BorderClearanceStatus = 'pre_clearance' | 'gate_queuing' | 'cd3_inspection' | 'cleared' | 'none';
export type FatigueStatus = 'rested' | 'caution' | 'fatigue_alert';

export interface TyreCondition {
  position: string; // e.g. "Steer Left", "Drive 1 Outer Left", etc.
  treadDepthMm: number; // e.g. 11.5 mm
  pressurePsi: number; // e.g. 115 psi
  status: 'good' | 'warning' | 'replace';
}

export interface Truck {
  registration: string; // document ID, e.g. "JRB 216MP" or "KBR 813MP"
  driver: string;       // e.g. "Tichaona" or "Anthony"
  make: string;         // e.g. "Scania R500 V8 Streamline"
  status: TruckStatus;
  currentLocation?: GeoPoint | { latitude: number; longitude: number };
  lastPing?: Timestamp | string | Date;
  odometerKm?: number;
  currentOdometer?: number;
  nextServiceKm?: number;
  continuousDriveMinutes?: number;
  shiftDriveHours?: number;
  fatigueStatus?: FatigueStatus;
  tyres?: TyreCondition[];
  // SA Compliance Records
  cofExpiryDate?: string; // Certificate of Fitness
  operatorCardDisc?: string;
  licenceDiscExpiry?: string;
  prdpExpiryDate?: string;
  driverPhone?: string;
  phoneGpsTelemetry?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    speedKmh?: number;
    heading?: number;
    pingedFromPhone: boolean;
    driverPhone?: string;
    driverName?: string;
    milestone?: string;
    isStationary?: boolean;
    stationaryMinutes?: number;
    stationaryAlertTriggered?: boolean;
    timestamp: Timestamp | string | Date;
  };
}

export interface PreTripInspection {
  departureOdometerKm?: number;
  odometerDeparture?: number;
  fuelLevelPct?: number;
  fuelLevelDeparturePct?: number;
  litresIssuedDepot?: number;
  tyresChecked?: boolean;
  spareTyreChecked?: boolean;
  spareTyresChecked?: boolean;
  brakesChecked?: boolean;
  lightsChecked?: boolean;
  lightsAndIndicatorsChecked?: boolean;
  fluidsChecked?: boolean; // Oil & Coolant
  wipersChecked?: boolean;
  fireExtinguisherChecked?: boolean;
  fireExtinguisherPresent?: boolean;
  warningTrianglesChecked?: boolean;
  warningTriangles2xPresent?: boolean; // 2x required by SA Law
  firstAidKitChecked?: boolean;
  firstAidKitPresent?: boolean;
  loadRestraintsChecked?: boolean;
  // SA Driver Docs
  prdpValid?: boolean;
  prdpConfirmedValid?: boolean;
  driverLicenceValid?: boolean;
  medicalCertValid?: boolean;
  medicalCertificateValid?: boolean;
  driverName?: string;
  driverPrdpNumber?: string;
  driverSignature?: string;
  driverSignatureName?: string;
  // SA Vehicle Docs
  cofValid?: boolean;
  operatorCardValid?: boolean;
  vehicleLicenceDiscValid?: boolean;
  gitInsuranceValid?: boolean;
  insuranceOnBoard?: boolean;
  notes?: string;
  completedAt?: string;
  acceptedAt?: Timestamp | string | Date;
}

export interface WeighbridgeTicket {
  ticketNumber: string;
  date?: string;
  steerAxleKg?: number;
  driveAxleGroupKg?: number;
  trailerAxleGroupKg?: number;
  grossVehicleMassKg?: number;
  isOverloaded?: boolean;
  ticketPhotoUrl?: string;
}

export interface CollectionLog {
  waybillNumber: string;
  sealNumber: string;
  quantityLoaded: number | string;
  weightTons?: number;
  conditionOnLoading: 'clean' | 'short_loaded' | 'damaged' | 'intact';
  discrepancyNotes?: string;
  waybillPhotoUrl?: string;
  signedWaybillPhotoUrl?: string;
  weighbridgeTicketPhotoUrl?: string;
  weighbridgeTicket?: WeighbridgeTicket;
  shipperRepresentative?: string;
  shipperSignedWaybillPhotoUrl?: string;
  capturedAt?: string;
  arrivalShipperTime?: string;
  departureShipperTime?: string;
  detentionWaitingHours?: number;
  axleWeights?: {
    steerTons: number;
    driveBogieTons: number;
    trailerTons: number;
    gvmTons: number;
    overloadStatus: 'compliant' | 'overload_warning';
  };
  arrivedShipperAt?: Timestamp | string | Date;
  loadedAt?: Timestamp | string | Date;
  departedShipperAt?: Timestamp | string | Date;
  loadingDetentionHours?: number;
}

export interface DeliveryPOD {
  receiverName: string;
  receiverSignature: string; // Digital signature
  companyStampPhotoUrl?: string;
  deliveredGoodsPhotoUrl?: string;
  goodsPhotoUrl?: string;
  capturedAt?: string;
  arrivedConsigneeAt?: Timestamp | string | Date;
  arrivalConsigneeTime?: string;
  offloadedAt?: Timestamp | string | Date;
  offloadCompleteTime?: string;
  closingOdometerKm?: number;
  odometerArrival?: number;
  shortagesDescription?: string;
  damagedGoodsDescription?: string;
  creditNoteRequired?: boolean;
  creditNoteAmountUSD?: number;
  chepPalletsReturned?: number;
  palletsOrEquipmentReturned?: number;
  customerRemarks?: string;
  deliveryDetentionHours?: number;
  detentionHours?: number;
  podSignedAt?: Timestamp | string | Date;
  hasDiscrepancy?: boolean;
  damagesOrShortagesNotes?: string;
}

export interface TripDelayOrIncident {
  id: string;
  type: 'traffic' | 'breakdown' | 'border_queue' | 'customer_not_ready' | 'tyre_blowout' | 'police_fine' | 'accident' | 'weather' | 'toll_queue' | 'weighbridge_inspection';
  title?: string;
  description: string;
  location: string;
  delayHours: number;
  photoUrl?: string;
  timestamp: Timestamp | string | Date;
  isBillableDetention?: boolean;
  isBillableToCustomer?: boolean;
}

export interface TripInvoice {
  invoiceNumber: string;
  customerName: string;
  customerAccountCode?: string;
  customerPoNumber: string;
  vatNumber?: string;
  customerVatNumber?: string;
  customerAddress?: string;
  billingAddress?: string;
  supplierName?: string;
  supplierVatNumber?: string;
  supplierAddress?: string;
  supplierTaxNumber?: string;
  date?: string;
  dueDate?: string;
  currency?: string;
  baseRateUSD?: number;
  baseFreightAmount?: number;
  rateType?: 'per_trip' | 'per_ton' | 'per_km' | 'per_pallet';
  rateUnits?: number;
  // Billable surcharges
  fuelSurchargeUSD?: number;
  fuelSurcharge?: number;
  waitingDetentionSurchargeUSD?: number;
  detentionSurcharge?: number;
  tollsRechargedUSD?: number;
  tollRecharge?: number;
  crossBorderHandlingUSD?: number;
  crossBorderHandlingFee?: number;
  palletHireUSD?: number;
  creditNoteDeductionUSD?: number;
  creditNoteDeduction?: number;
  subtotalUSD?: number;
  vatRatePct: number; // 15% SA VAT or 0% zero-rated export
  isCrossBorderZeroRated?: boolean;
  vatAmountUSD?: number;
  vatAmount?: number;
  totalUSD?: number;
  totalAmountDue?: number;
  status: 'draft' | 'issued' | 'paid' | 'sent';
  podVerified: boolean;
  issuedAt?: Timestamp | string | Date;
}

export interface TripCostingBreakdown {
  fuelCostUSD: number;
  fuelLitresTotal: number;
  tollsCostUSD: number;
  borderAndCustomsFeesUSD: number;
  driverSubsistenceUSD: number;
  sarsPrescribedLimitUSD: number; // SARS meal & incidental daily limit
  taxableSubsistenceUSD: number;
  standingVehicleCostUSD: number;
  totalCostUSD: number;
  costPerKmUSD: number;
  revenuePerKmUSD: number;
  netTripProfitUSD: number;
  netMarginPct: number;
}

export interface Trip {
  id: string;
  tripReferenceNumber?: string; // Master reference tying POD, invoice, fuel, costs
  truckId: DocumentReference | string;
  driver: string;
  startDate: Timestamp | string | Date;
  endDate: Timestamp | string | Date;
  origin: string;
  destination: string;
  status: TripStatus;

  // Part 1-A: Pre-Trip Admin Dispatch Specifications
  customerName?: string;
  customerAccountCode?: string;
  customerPoNumber?: string;
  collectionAddress?: string;
  collectionContactPerson?: string;
  collectionContactPhone?: string;
  collectionPhone?: string;
  collectionWindowStart?: string;
  collectionWindowEnd?: string;
  deliveryAddress?: string;
  deliveryContactPerson?: string;
  deliveryContactPhone?: string;
  deliveryPhone?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  cargo?: string;
  cargoCommodity?: string;
  cargoWeightKg?: number;
  weightTons?: number;
  palletCount?: number;
  dimensions?: string;
  dimensionsMeters?: string;
  specialInstructions?: string;
  scheduledCollectionWindow?: string;
  scheduledDeliveryWindow?: string;
  totalKm?: number;
  agreedRate?: number | {
    type: 'per_trip' | 'per_ton' | 'per_km' | 'per_pallet';
    rate: number;
    currency: 'USD' | 'ZAR';
    minimumCharge?: number;
  };
  departureOdometer?: number;
  departureFuelLevelPct?: number;
  closingOdometer?: number;
  rateType?: 'per_trip' | 'per_ton' | 'per_km' | 'per_pallet';
  billingCurrency?: CurrencyCode | string;
  isCrossBorder?: boolean;
  borderPostName?: string;
  clearingAgentName?: string;
  clearingAgentContact?: string;
  hasCrossBorderPermit?: boolean;
  hasComesaYellowCard?: boolean;

  // Part 1-B: Pre-Trip Driver Checklist & Roadworthiness (Depot)
  preTripInspection?: PreTripInspection;

  // Part 1-C: Collection & Loading Confirmation (Shipper)
  collectionLog?: CollectionLog;

  // Part 1-D: Delivery & Signed POD (Consignee)
  deliveryPod?: DeliveryPOD;

  // Delays, Detentions & Incident Reports
  delaysAndIncidents?: TripDelayOrIncident[];

  // Part 1-E: SA Cross-Border & Customs Manifests
  borderCheckpoint?: BorderCheckpoint;
  borderEntryTime?: Timestamp | string | Date;
  borderStatus?: BorderClearanceStatus;
  demurrageDailyRateUSD?: number;
  customsManifestNumber?: string;
  consignmentValueUSD?: number;
  gitPolicyNumber?: string;
  tipNumber?: string; // Temporary Import Permit
  sad500Reference?: string; // SAD500 / CD3 declaration
  comesaYellowCardNumber?: string;

  // Part 2: Accounting, Invoicing & Costing
  revenueUSD?: number;
  invoice?: TripInvoice;
  costing?: TripCostingBreakdown;
}

export type UserRole = 'admin' | 'accountant' | 'dispatcher' | 'driver';
export type AuditStatus = 'verified' | 'pending' | 'flagged';

export interface FuelLog {
  id: string;
  truckId: DocumentReference | string;
  tripId: DocumentReference | string;
  litres: number;
  stationName: string;
  location: string;
  cost: number;
  currency: CurrencyCode | string;
  receiptUrl: string;
  timestamp: Timestamp | string | Date;
  odometerReadingKm?: number;
  auditStatus?: AuditStatus;
  auditedBy?: string;
  auditedAt?: Timestamp | string | Date;
}

export interface Expense {
  id: string;
  truckId: DocumentReference | string;
  tripId: DocumentReference | string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: CurrencyCode | string;
  receiptUrl: string;
  timestamp: Timestamp | string | Date;
  auditStatus?: AuditStatus;
  auditedBy?: string;
  auditedAt?: Timestamp | string | Date;
}

export interface PettyCash {
  id: string;
  truckId: DocumentReference | string;
  tripId: DocumentReference | string;
  type: PettyCashType;
  amount: number;
  currency: CurrencyCode | string;
  balanceAfter: number;
  linkedExpenseId: DocumentReference | string;
  timestamp: Timestamp | string | Date;
  status?: 'approved' | 'pending';
  approvedBy?: string;
}

export interface Maintenance {
  id: string;
  truckId: DocumentReference | string;
  tripId: DocumentReference | string;
  description: string;
  cost: number;
  currency: CurrencyCode | string;
  receiptUrl: string;
  timestamp: Timestamp | string | Date;
}

export interface ExchangeRates {
  ZAR_USD: number;
  BWP_ZAR: number;
  ZMW_ZAR: number;
  updatedAt: Timestamp | string | Date;
}

export interface FileRecord {
  id: string;
  fileName: string;
  downloadUrl: string;
  fileType: string;
  storagePath: string;
  linkedTo: DocumentReference | string;
  uploadedBy: string;
  timestamp: Timestamp | string | Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  assignedTruck?: string;      // "JRB 216MP" or "KBR 813MP"
  assignedDriverName?: string;  // "Tichaona" or "Anthony"
  phoneNumber?: string;
  prdpNumber?: string;
  prdpExpiryDate?: string;
  phoneGpsEnabled?: boolean;
}

export type ReportType = 'All' | 'Fuel' | 'Expenses' | 'Maintenance';

export interface GeneratedReportRecord {
  id: string;
  name: string;
  reportType: ReportType;
  truck: string;
  dateRange: string;
  recordCount: number;
  totalZAR: number;
  downloadUrl: string;
  createdAt: Date | string;
}

