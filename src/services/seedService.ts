import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
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
    currentLocation: { latitude: -17.8252, longitude: 31.0335 }, // Harare Depot, Zimbabwe
    lastPing: new Date(),
    odometerKm: 488420,
    nextServiceKm: 500000,
    continuousDriveMinutes: 0,
    shiftDriveHours: 0,
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
    currentLocation: { latitude: -26.2041, longitude: 28.0473 }, // Johannesburg Depot, South Africa
    lastPing: new Date(),
    odometerKm: 342180,
    nextServiceKm: 350000,
    continuousDriveMinutes: 0,
    shiftDriveHours: 0,
    fatigueStatus: 'rested',
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

    // 2. Verify and seed base fleet prime movers: JRB 216MP and KBR 813MP
    const truck1Ref = doc(db, 'trucks', 'JRB 216MP');
    const truck1Snap = await getDoc(truck1Ref);
    if (!truck1Snap.exists()) {
      await setDoc(truck1Ref, {
        registration: 'JRB 216MP',
        driver: 'Tichaona',
        make: 'Scania R500 V8 Streamline (6x4)',
        status: 'active',
        currentLocation: new GeoPoint(-17.8252, 31.0335), // Harare Depot, Zimbabwe
        lastPing: Timestamp.now(),
        odometerKm: 488420,
        nextServiceKm: 500000,
        continuousDriveMinutes: 0,
        shiftDriveHours: 0,
        fatigueStatus: 'rested',
        tyres: INITIAL_DEMO_TRUCKS[0].tyres
      });
      console.log('Seeded truck JRB 216MP (clean depot status)');
    }

    const truck2Ref = doc(db, 'trucks', 'KBR 813MP');
    const truck2Snap = await getDoc(truck2Ref);
    if (!truck2Snap.exists()) {
      await setDoc(truck2Ref, {
        registration: 'KBR 813MP',
        driver: 'Anthony',
        make: 'Volvo FH16 750 Globetrotter (6x4)',
        status: 'active',
        currentLocation: new GeoPoint(-26.2041, 28.0473), // Johannesburg Depot, South Africa
        lastPing: Timestamp.now(),
        odometerKm: 342180,
        nextServiceKm: 350000,
        continuousDriveMinutes: 0,
        shiftDriveHours: 0,
        fatigueStatus: 'rested',
        tyres: INITIAL_DEMO_TRUCKS[1].tyres
      });
      console.log('Seeded truck KBR 813MP (clean depot status)');
    }
  } catch (error) {
    console.warn('Fleet database seeding note (continuing):', error);
  }
}

/**
 * Clear all operational logs, trips, fuel entries, expenses, petty cash floats, and maintenance history.
 * Resets fleet vehicles to fresh depot readiness (0 continuous hours, rested).
 */
export async function clearAllFleetOperations(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  let deletedCount = 0;
  const collectionsToClear = ['trips', 'fuel_logs', 'expenses', 'petty_cash', 'maintenance', 'files'];

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        // Also clean up nested subcollections like trip_locations
        try {
          const locSnap = await getDocs(collection(db, colName, d.id, 'trip_locations'));
          for (const locDoc of locSnap.docs) {
            await deleteDoc(locDoc.ref);
            deletedCount++;
          }
        } catch {}
        await deleteDoc(d.ref);
        deletedCount++;
      }
    } catch (e: any) {
      console.warn(`Notice clearing ${colName}:`, e?.message || e);
    }
  }

  // Reset trucks to clean depot state in Firestore
  try {
    const jrbRef = doc(db, 'trucks', 'JRB 216MP');
    const jrbSnap = await getDoc(jrbRef);
    if (jrbSnap.exists()) {
      await setDoc(jrbRef, {
        registration: 'JRB 216MP',
        driver: 'Tichaona',
        make: 'Scania R500 V8 Streamline (6x4)',
        status: 'active',
        currentLocation: new GeoPoint(-17.8252, 31.0335),
        lastPing: Timestamp.now(),
        odometerKm: 488420,
        nextServiceKm: 500000,
        continuousDriveMinutes: 0,
        shiftDriveHours: 0,
        fatigueStatus: 'rested',
        tyres: INITIAL_DEMO_TRUCKS[0].tyres
      }, { merge: true });
    }

    const kbrRef = doc(db, 'trucks', 'KBR 813MP');
    const kbrSnap = await getDoc(kbrRef);
    if (kbrSnap.exists()) {
      await setDoc(kbrRef, {
        registration: 'KBR 813MP',
        driver: 'Anthony',
        make: 'Volvo FH16 750 Globetrotter (6x4)',
        status: 'active',
        currentLocation: new GeoPoint(-26.2041, 28.0473),
        lastPing: Timestamp.now(),
        odometerKm: 342180,
        nextServiceKm: 350000,
        continuousDriveMinutes: 0,
        shiftDriveHours: 0,
        fatigueStatus: 'rested',
        tyres: INITIAL_DEMO_TRUCKS[1].tyres
      }, { merge: true });
    }
  } catch (e: any) {
    console.warn('Truck reset notice:', e?.message || e);
  }

  return { success: true, deletedCount };
}
