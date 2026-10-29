import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Truck, Trip, FuelLog, Expense, PettyCash, Maintenance, FileRecord, ExchangeRates } from '../types';

export const INITIAL_DEMO_EXCHANGE_RATES: ExchangeRates = {
  ZAR_USD: 0.0545,
  BWP_ZAR: 1.35,
  ZMW_ZAR: 0.68,
  updatedAt: new Date()
};

export const INITIAL_DEMO_TRUCKS: Truck[] = [
  {
    registration: 'JRB 216MP',
    driver: 'Tichaona',
    make: 'Scania R500 V8 Streamline (6x4)',
    status: 'active',
    currentLocation: { latitude: -17.8252, longitude: 31.0335 }, // Harare, Zimbabwe
    lastPing: new Date(),
    odometerKm: 488420,
    nextServiceKm: 500000,
    continuousDriveMinutes: 145, // 2h 25m continuous drive
    shiftDriveHours: 5.5,
    fatigueStatus: 'rested',
    tyres: [
      { position: 'Steer Left (Pos 1)', treadDepthMm: 11.2, pressurePsi: 118, status: 'good' },
      { position: 'Steer Right (Pos 2)', treadDepthMm: 10.8, pressurePsi: 116, status: 'good' },
      { position: 'Drive 1 Outer Left (Pos 3)', treadDepthMm: 9.5, pressurePsi: 110, status: 'good' },
      { position: 'Drive 1 Inner Left (Pos 4)', treadDepthMm: 9.1, pressurePsi: 108, status: 'good' },
      { position: 'Drive 1 Inner Right (Pos 5)', treadDepthMm: 8.8, pressurePsi: 106, status: 'warning' },
      { position: 'Drive 1 Outer Right (Pos 6)', treadDepthMm: 9.0, pressurePsi: 108, status: 'good' },
      { position: 'Drive 2 Outer Left (Pos 7)', treadDepthMm: 9.8, pressurePsi: 112, status: 'good' },
      { position: 'Drive 2 Inner Left (Pos 8)', treadDepthMm: 9.4, pressurePsi: 110, status: 'good' },
      { position: 'Drive 2 Inner Right (Pos 9)', treadDepthMm: 9.2, pressurePsi: 109, status: 'good' },
      { position: 'Drive 2 Outer Right (Pos 10)', treadDepthMm: 9.6, pressurePsi: 111, status: 'good' },
    ]
  },
  {
    registration: 'KBR 813MP',
    driver: 'Anthony',
    make: 'Volvo FH16 750 Globetrotter (6x4)',
    status: 'active',
    currentLocation: { latitude: -26.2041, longitude: 28.0473 }, // Johannesburg, South Africa
    lastPing: new Date(),
    odometerKm: 342180,
    nextServiceKm: 350000,
    continuousDriveMinutes: 260, // 4h 20m continuous drive (caution)
    shiftDriveHours: 8.0,
    fatigueStatus: 'caution',
    tyres: [
      { position: 'Steer Left (Pos 1)', treadDepthMm: 12.0, pressurePsi: 120, status: 'good' },
      { position: 'Steer Right (Pos 2)', treadDepthMm: 11.9, pressurePsi: 120, status: 'good' },
      { position: 'Drive 1 Outer Left (Pos 3)', treadDepthMm: 10.2, pressurePsi: 112, status: 'good' },
      { position: 'Drive 1 Inner Left (Pos 4)', treadDepthMm: 10.0, pressurePsi: 110, status: 'good' },
      { position: 'Drive 1 Inner Right (Pos 5)', treadDepthMm: 9.9, pressurePsi: 110, status: 'good' },
      { position: 'Drive 1 Outer Right (Pos 6)', treadDepthMm: 10.1, pressurePsi: 111, status: 'good' },
      { position: 'Drive 2 Outer Left (Pos 7)', treadDepthMm: 10.4, pressurePsi: 114, status: 'good' },
      { position: 'Drive 2 Inner Left (Pos 8)', treadDepthMm: 10.1, pressurePsi: 112, status: 'good' },
      { position: 'Drive 2 Inner Right (Pos 9)', treadDepthMm: 10.0, pressurePsi: 111, status: 'good' },
      { position: 'Drive 2 Outer Right (Pos 10)', treadDepthMm: 10.3, pressurePsi: 113, status: 'good' },
    ]
  }
];

export async function initializeFleetDatabase(): Promise<void> {
  // CRITICAL: Only attempt Firestore writes if a user is authenticated!
  if (!auth.currentUser) {
    return;
  }

  try {
    // 1. Verify and seed exchange_rates/latest
    const exchangeRef = doc(db, 'exchange_rates', 'latest');
    const exchangeSnap = await getDoc(exchangeRef);
    if (!exchangeSnap.exists()) {
      await setDoc(exchangeRef, {
        ZAR_USD: 0.0545,
        BWP_ZAR: 1.35,
        ZMW_ZAR: 0.68,
        updatedAt: Timestamp.now()
      });
      console.log('Seeded exchange_rates/latest');
    }

    // 2. Verify and seed trucks: JRB 216MP (Tichaona) and KBR 813MP (Anthony)
    const truck1Ref = doc(db, 'trucks', 'JRB 216MP');
    const truck1Snap = await getDoc(truck1Ref);
    if (!truck1Snap.exists()) {
      await setDoc(truck1Ref, {
        registration: 'JRB 216MP',
        driver: 'Tichaona',
        make: 'Scania R500 V8 Streamline (6x4)',
        status: 'active',
        currentLocation: new GeoPoint(-17.8252, 31.0335), // Harare, Zimbabwe
        lastPing: Timestamp.now(),
        odometerKm: 488420,
        nextServiceKm: 500000,
        continuousDriveMinutes: 145,
        shiftDriveHours: 5.5,
        fatigueStatus: 'rested',
        tyres: INITIAL_DEMO_TRUCKS[0].tyres
      });
      console.log('Seeded truck JRB 216MP');
    }

    const truck2Ref = doc(db, 'trucks', 'KBR 813MP');
    const truck2Snap = await getDoc(truck2Ref);
    if (!truck2Snap.exists()) {
      await setDoc(truck2Ref, {
        registration: 'KBR 813MP',
        driver: 'Anthony',
        make: 'Volvo FH16 750 Globetrotter (6x4)',
        status: 'active',
        currentLocation: new GeoPoint(-26.2041, 28.0473), // Johannesburg, South Africa
        lastPing: Timestamp.now(),
        odometerKm: 342180,
        nextServiceKm: 350000,
        continuousDriveMinutes: 260,
        shiftDriveHours: 8.0,
        fatigueStatus: 'caution',
        tyres: INITIAL_DEMO_TRUCKS[1].tyres
      });
      console.log('Seeded truck KBR 813MP');
    }

    // 3. Check if trips exist, if not seed initial demo corridor trips
    const tripsSnap = await getDocs(collection(db, 'trips'));
    if (tripsSnap.empty) {
      const trip1Doc = await addDoc(collection(db, 'trips'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        driver: 'Tichaona',
        startDate: Timestamp.fromDate(new Date(Date.now() - 3 * 86400000)),
        endDate: Timestamp.fromDate(new Date(Date.now() + 2 * 86400000)),
        origin: 'Kamativi Tin Mine / Harare Depot, ZIM',
        destination: 'Durban Container Terminal Port, SA',
        status: 'in_progress',
        revenueUSD: 4850,
        cargo: 'Tin Ore Concentrate (32 Metric Tons)',
        totalKm: 1680,
        borderCheckpoint: 'Beitbridge',
        borderEntryTime: Timestamp.fromDate(new Date(Date.now() - 7 * 3600000)), // 7 hours ago
        borderStatus: 'cd3_inspection',
        demurrageDailyRateUSD: 250,
        customsManifestNumber: 'ZIM-CD3-2026-9041',
        consignmentValueUSD: 84000,
        gitPolicyNumber: 'GIT-SADC-99201-ZW'
      });

      const trip2Doc = await addDoc(collection(db, 'trips'), {
        truckId: doc(db, 'trucks', 'KBR 813MP'),
        driver: 'Anthony',
        startDate: Timestamp.fromDate(new Date(Date.now() - 5 * 86400000)),
        endDate: Timestamp.fromDate(new Date(Date.now() + 1 * 86400000)),
        origin: 'Johannesburg Logistics Park, SA',
        destination: 'Chirundu Border / Lusaka Mining Depot, ZAM',
        status: 'in_progress',
        revenueUSD: 5400,
        cargo: 'Mining Industrial Machinery & Spare Parts',
        totalKm: 1720,
        borderCheckpoint: 'Chirundu',
        borderEntryTime: Timestamp.fromDate(new Date(Date.now() - 21 * 3600000)), // 21 hours ago (demurrage alert!)
        borderStatus: 'gate_queuing',
        demurrageDailyRateUSD: 250,
        customsManifestNumber: 'ZAM-COMESA-2026-1188',
        consignmentValueUSD: 145000,
        gitPolicyNumber: 'GIT-SADC-88314-SA'
      });

      // Seed Fuel Logs
      await addDoc(collection(db, 'fuel_logs'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        tripId: trip1Doc,
        litres: 450,
        stationName: 'Puma Energy Truckstop',
        location: 'Beitbridge Border, Zimbabwe',
        cost: 652.50,
        currency: 'USD',
        receiptUrl: 'https://firebasestorage.googleapis.com/v0/b/substantial-nebula-3zbz0.firebasestorage.app/o/fuel_receipts%2FJRB_216MP%2Fdemo_fuel_receipt_jrb.pdf?alt=media',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 86400000))
      });

      await addDoc(collection(db, 'fuel_logs'), {
        truckId: doc(db, 'trucks', 'KBR 813MP'),
        tripId: trip2Doc,
        litres: 520,
        stationName: 'Engen 1-Stop Polokwane',
        location: 'Polokwane N1, South Africa',
        cost: 11960.00,
        currency: 'ZAR',
        receiptUrl: 'https://firebasestorage.googleapis.com/v0/b/substantial-nebula-3zbz0.firebasestorage.app/o/fuel_receipts%2FKBR_813MP%2Fdemo_fuel_receipt_kbr.pdf?alt=media',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 86400000))
      });

      // Seed Expenses
      await addDoc(collection(db, 'expenses'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        tripId: trip1Doc,
        category: 'tollgate',
        description: 'Beitbridge Commercial Vehicle Tollgate Access',
        amount: 280.00,
        currency: 'USD',
        receiptUrl: '',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 86400000))
      });

      await addDoc(collection(db, 'expenses'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        tripId: trip1Doc,
        category: 'seal',
        description: 'ZIMRA Customs Electronic Cargo Tracking Seal (ECTS)',
        amount: 30.00,
        currency: 'USD',
        receiptUrl: '',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 86400000))
      });

      await addDoc(collection(db, 'expenses'), {
        truckId: doc(db, 'trucks', 'KBR 813MP'),
        tripId: trip2Doc,
        category: 'tracker',
        description: 'Cross-Border Satellite Telemetry & Geofence Verification',
        amount: 850.00,
        currency: 'ZAR',
        receiptUrl: '',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 3 * 86400000))
      });

      // Seed Petty Cash
      await addDoc(collection(db, 'petty_cash'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        tripId: trip1Doc,
        type: 'top_up',
        amount: 500.00,
        currency: 'USD',
        balanceAfter: 500.00,
        linkedExpenseId: '',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 3 * 86400000))
      });

      await addDoc(collection(db, 'petty_cash'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        tripId: trip1Doc,
        type: 'expense_deduction',
        amount: 310.00,
        currency: 'USD',
        balanceAfter: 190.00,
        linkedExpenseId: 'Toll & Seal at Beitbridge',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 86400000))
      });

      await addDoc(collection(db, 'petty_cash'), {
        truckId: doc(db, 'trucks', 'KBR 813MP'),
        tripId: trip2Doc,
        type: 'top_up',
        amount: 8000.00,
        currency: 'ZAR',
        balanceAfter: 8000.00,
        linkedExpenseId: '',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 5 * 86400000))
      });

      // Seed Maintenance
      await addDoc(collection(db, 'maintenance'), {
        truckId: doc(db, 'trucks', 'JRB 216MP'),
        tripId: trip1Doc,
        description: 'Drive-axle tyre puncture vulcanizing & air pressure calibration at Musina workshop',
        cost: 65.00,
        currency: 'USD',
        receiptUrl: '',
        timestamp: Timestamp.fromDate(new Date(Date.now() - 1 * 86400000))
      });

      // Seed Files
      await addDoc(collection(db, 'files'), {
        fileName: 'Bill_of_Lading_Tin_Concentrate_JRB216MP.pdf',
        downloadUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'pdf',
        storagePath: 'docs/JRB_216MP/bol_001.pdf',
        linkedTo: doc(db, 'trucks', 'JRB 216MP'),
        uploadedBy: 'Dispatch Operations',
        timestamp: Timestamp.now()
      });

      await addDoc(collection(db, 'files'), {
        fileName: 'ZIMRA_Customs_Transit_Clearance_Form_CD3.pdf',
        downloadUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'pdf',
        storagePath: 'docs/JRB_216MP/zimra_cd3.pdf',
        linkedTo: doc(db, 'trucks', 'JRB 216MP'),
        uploadedBy: 'Customs Agent',
        timestamp: Timestamp.now()
      });

      console.log('Seeded comprehensive demo fleet records for MARVEL TIN S.A/ZIM');
    }
  } catch (error) {
    console.warn('Fleet database seeding note (continuing):', error);
  }
}
