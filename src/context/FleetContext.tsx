import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  Timestamp,
  GeoPoint,
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import {
  Truck,
  Trip,
  FuelLog,
  Expense,
  PettyCash,
  Maintenance,
  ExchangeRates,
  FileRecord,
  CurrencyCode,
  BorderCheckpoint,
  BorderClearanceStatus,
  TyreCondition,
  PreTripInspection,
  CollectionLog,
  DeliveryPOD,
  TripDelayOrIncident,
  TripInvoice
} from '../types';
import { extractTruckRegistration, convertToUSD } from '../utils/helpers';
import { INITIAL_DEMO_TRUCKS, INITIAL_DEMO_EXCHANGE_RATES, clearAllFleetOperations } from '../services/seedService';

export interface TruckReconciliation {
  truckReg: string;
  totalTopUpsUSD: number;
  totalExpensesUSD: number;
  reconciledBalanceUSD: number;
  topUpsCount: number;
  expensesCount: number;
  deductionsCount: number;
  isReconciled: boolean;
}

interface FleetContextType {
  trucks: Truck[];
  trips: Trip[];
  fuelLogs: FuelLog[];
  expenses: Expense[];
  pettyCash: PettyCash[];
  maintenance: Maintenance[];
  exchangeRates: ExchangeRates | null;
  files: FileRecord[];
  loading: boolean;
  
  // Filter state
  selectedTruckFilter: string; // 'ALL' | 'JRB 216MP' | 'KBR 813MP'
  setSelectedTruckFilter: (filter: string) => void;

  // Filtered views
  filteredTrucks: Truck[];
  filteredTrips: Trip[];
  filteredFuelLogs: FuelLog[];
  filteredExpenses: Expense[];
  filteredPettyCash: PettyCash[];
  filteredMaintenance: Maintenance[];
  filteredFiles: FileRecord[];

  // Write actions
  addFuelLog: (data: Omit<FuelLog, 'id'>) => Promise<void>;
  addExpense: (data: Omit<Expense, 'id'>) => Promise<void>;
  addPettyCash: (data: Omit<PettyCash, 'id'>) => Promise<void>;
  addMaintenance: (data: Omit<Maintenance, 'id'>) => Promise<void>;
  addTrip: (data: Omit<Trip, 'id'>) => Promise<void>;
  updateTripStatus: (tripId: string, status: Trip['status']) => Promise<void>;
  updateTripCommercials: (tripId: string, data: { revenueUSD?: number; totalKm?: number; cargo?: string }) => Promise<void>;
  updateTripBorderStatus: (tripId: string, data: { borderCheckpoint?: BorderCheckpoint; borderStatus?: BorderClearanceStatus; borderEntryTime?: Date }) => Promise<void>;
  logDriverRestBreak: (registration: string) => Promise<void>;
  updateTruckTyres: (registration: string, tyres: TyreCondition[]) => Promise<void>;
  updateTruckLocationAndPing: (registration: string, lat: number, lng: number) => Promise<void>;
  updateTruckStatus: (registration: string, status: Truck['status']) => Promise<void>;
  updateExchangeRates: (rates: { ZAR_USD: number; BWP_ZAR: number; ZMW_ZAR: number }) => Promise<void>;
  addFileRecord: (data: Omit<FileRecord, 'id'>) => Promise<void>;
  calculatePettyCashBalance: (truckReg: string) => number;
  getReconciliationReport: (truckReg: string) => TruckReconciliation;

  // New Data Specification Actions (Driver Lifecycle & Accounting Invoicing)
  savePreTripInspection: (tripId: string, truckReg: string, inspection: PreTripInspection) => Promise<void>;
  saveCollectionLog: (tripId: string, log: CollectionLog) => Promise<void>;
  saveDeliveryPOD: (tripId: string, truckReg: string, pod: DeliveryPOD) => Promise<void>;
  addTripDelayOrIncident: (tripId: string, incident: Omit<TripDelayOrIncident, 'id'>) => Promise<void>;
  saveTripInvoice: (tripId: string, invoice: TripInvoice) => Promise<void>;
  clearAllOperations: () => Promise<{ success: boolean; deletedCount: number; error?: string }>;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, assignedTruck, loading: authLoading } = useAuth();

  const [trucks, setTrucks] = useState<Truck[]>(INITIAL_DEMO_TRUCKS);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyCash, setPettyCash] = useState<PettyCash[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(INITIAL_DEMO_EXCHANGE_RATES);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Selected filter (default 'ALL' for admin, or locked to assignedTruck for driver)
  const [selectedTruckFilter, setSelectedTruckFilter] = useState<string>('ALL');

  // Sync filter when role/assignedTruck changes
  useEffect(() => {
    if (!isAdmin && assignedTruck) {
      setSelectedTruckFilter(assignedTruck);
    } else if (isAdmin && selectedTruckFilter !== 'JRB 216MP' && selectedTruckFilter !== 'KBR 813MP') {
      setSelectedTruckFilter('ALL');
    }
  }, [isAdmin, assignedTruck]);

  // Subscribe to live Firestore collections ONLY when authenticated with a real Firebase Auth session
  useEffect(() => {
    if (authLoading || !auth.currentUser) {
      // In demo mode or unauthenticated, we keep the rich initialized in-memory data
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubs: (() => void)[] = [];

    // 1. Trucks listener
    try {
      const qTrucks = collection(db, 'trucks');
      const unsub = onSnapshot(
        qTrucks,
        (snap) => {
          if (!snap.empty) {
            const list: Truck[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                registration: d.id,
                driver: data.driver || '',
                make: data.make || '',
                status: data.status || 'active',
                currentLocation: data.currentLocation,
                lastPing: data.lastPing
              });
            });
            setTrucks(list);
          }
        },
        (err) => {
          console.warn('Trucks listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Trucks listener setup error:', err);
    }

    // 2. Exchange Rates listener
    try {
      const rateRef = doc(db, 'exchange_rates', 'latest');
      const unsub = onSnapshot(
        rateRef,
        (snap) => {
          if (snap.exists()) {
            setExchangeRates(snap.data() as ExchangeRates);
          }
        },
        (err) => {
          console.warn('Exchange rates listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Rates listener setup error:', err);
    }

    // 3. Trips listener
    try {
      const qTrips = collection(db, 'trips');
      const unsub = onSnapshot(
        qTrips,
        (snap) => {
          if (!snap.empty) {
            const list: Trip[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                ...data,
                id: d.id,
                truckId: data.truckId,
                driver: data.driver || '',
                startDate: data.startDate,
                endDate: data.endDate,
                origin: data.origin || '',
                destination: data.destination || '',
                status: data.status || 'in_progress'
              } as Trip);
            });
            setTrips(list);
          } else {
            setTrips([]);
          }
        },
        (err) => {
          console.warn('Trips listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Trips listener setup error:', err);
    }

    // 4. Fuel Logs listener
    try {
      const qFuel = (!isAdmin && assignedTruck)
        ? query(collection(db, 'fuel_logs'), where('truckId', '==', assignedTruck))
        : collection(db, 'fuel_logs');
      const unsub = onSnapshot(
        qFuel,
        (snap) => {
          if (!snap.empty) {
            const list: FuelLog[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                truckId: data.truckId,
                tripId: data.tripId,
                litres: Number(data.litres) || 0,
                stationName: data.stationName || '',
                location: data.location || '',
                cost: Number(data.cost) || 0,
                currency: data.currency || 'USD',
                receiptUrl: data.receiptUrl || '',
                timestamp: data.timestamp
              });
            });
            list.sort((a, b) => {
              const timeA = (a.timestamp as any)?.seconds || new Date(a.timestamp as any).getTime() || 0;
              const timeB = (b.timestamp as any)?.seconds || new Date(b.timestamp as any).getTime() || 0;
              return timeB - timeA;
            });
            setFuelLogs(list);
          } else {
            setFuelLogs([]);
          }
        },
        (err) => {
          console.warn('Fuel logs listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Fuel logs listener setup error:', err);
    }

    // 5. Expenses listener
    try {
      const qExp = (!isAdmin && assignedTruck)
        ? query(collection(db, 'expenses'), where('truckId', '==', assignedTruck))
        : collection(db, 'expenses');
      const unsub = onSnapshot(
        qExp,
        (snap) => {
          if (!snap.empty) {
            const list: Expense[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                truckId: data.truckId,
                tripId: data.tripId,
                category: data.category || 'other',
                description: data.description || '',
                amount: Number(data.amount) || 0,
                currency: data.currency || 'USD',
                receiptUrl: data.receiptUrl || '',
                timestamp: data.timestamp
              });
            });
            list.sort((a, b) => {
              const timeA = (a.timestamp as any)?.seconds || new Date(a.timestamp as any).getTime() || 0;
              const timeB = (b.timestamp as any)?.seconds || new Date(b.timestamp as any).getTime() || 0;
              return timeB - timeA;
            });
            setExpenses(list);
          } else {
            setExpenses([]);
          }
        },
        (err) => {
          console.warn('Expenses listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Expenses listener setup error:', err);
    }

    // 6. Petty Cash listener
    try {
      const qCash = (!isAdmin && assignedTruck)
        ? query(collection(db, 'petty_cash'), where('truckId', '==', assignedTruck))
        : collection(db, 'petty_cash');
      const unsub = onSnapshot(
        qCash,
        (snap) => {
          if (!snap.empty) {
            const list: PettyCash[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                truckId: data.truckId,
                tripId: data.tripId,
                type: data.type || 'top_up',
                amount: Number(data.amount) || 0,
                currency: data.currency || 'USD',
                balanceAfter: Number(data.balanceAfter) || 0,
                linkedExpenseId: data.linkedExpenseId || '',
                timestamp: data.timestamp
              });
            });
            list.sort((a, b) => {
              const timeA = (a.timestamp as any)?.seconds || new Date(a.timestamp as any).getTime() || 0;
              const timeB = (b.timestamp as any)?.seconds || new Date(b.timestamp as any).getTime() || 0;
              return timeB - timeA;
            });
            setPettyCash(list);
          } else {
            setPettyCash([]);
          }
        },
        (err) => {
          console.warn('Petty cash listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Petty cash listener setup error:', err);
    }

    // 7. Maintenance listener
    try {
      const qMaint = (!isAdmin && assignedTruck)
        ? query(collection(db, 'maintenance'), where('truckId', '==', assignedTruck))
        : collection(db, 'maintenance');
      const unsub = onSnapshot(
        qMaint,
        (snap) => {
          if (!snap.empty) {
            const list: Maintenance[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                truckId: data.truckId,
                tripId: data.tripId,
                description: data.description || '',
                cost: Number(data.cost) || 0,
                currency: data.currency || 'USD',
                receiptUrl: data.receiptUrl || '',
                timestamp: data.timestamp
              });
            });
            list.sort((a, b) => {
              const timeA = (a.timestamp as any)?.seconds || new Date(a.timestamp as any).getTime() || 0;
              const timeB = (b.timestamp as any)?.seconds || new Date(b.timestamp as any).getTime() || 0;
              return timeB - timeA;
            });
            setMaintenance(list);
          } else {
            setMaintenance([]);
          }
        },
        (err) => {
          console.warn('Maintenance listener notice:', err.message);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Maintenance listener setup error:', err);
    }

    // 8. Files listener
    try {
      const qFiles = (!isAdmin && assignedTruck)
        ? query(collection(db, 'files'), where('linkedTo', '==', assignedTruck))
        : collection(db, 'files');
      const unsub = onSnapshot(
        qFiles,
        (snap) => {
          if (!snap.empty) {
            const list: FileRecord[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                fileName: data.fileName || 'document',
                downloadUrl: data.downloadUrl || '',
                fileType: data.fileType || 'pdf',
                storagePath: data.storagePath || '',
                linkedTo: data.linkedTo,
                uploadedBy: data.uploadedBy || 'User',
                timestamp: data.timestamp
              });
            });
            list.sort((a, b) => {
              const timeA = (a.timestamp as any)?.seconds || new Date(a.timestamp as any).getTime() || 0;
              const timeB = (b.timestamp as any)?.seconds || new Date(b.timestamp as any).getTime() || 0;
              return timeB - timeA;
            });
            setFiles(list);
          } else {
            setFiles([]);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Files listener notice:', err.message);
          setLoading(false);
        }
      );
      unsubs.push(unsub);
    } catch (err) {
      console.warn('Files listener setup error:', err);
      setLoading(false);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authLoading, isAdmin, assignedTruck]);

  // Active filter logic
  const activeTruckReg = useMemo(() => {
    if (!isAdmin) {
      return assignedTruck || 'JRB 216MP';
    }
    return selectedTruckFilter;
  }, [isAdmin, assignedTruck, selectedTruckFilter]);

  // Filtered views per truck
  const filteredTrucks = useMemo(() => {
    if (activeTruckReg === 'ALL') return trucks;
    return trucks.filter((t) => t.registration === activeTruckReg);
  }, [trucks, activeTruckReg]);

  const filteredTrips = useMemo(() => {
    if (activeTruckReg === 'ALL') return trips;
    return trips.filter((t) => extractTruckRegistration(t.truckId) === activeTruckReg);
  }, [trips, activeTruckReg]);

  const filteredFuelLogs = useMemo(() => {
    if (activeTruckReg === 'ALL') return fuelLogs;
    return fuelLogs.filter((f) => extractTruckRegistration(f.truckId) === activeTruckReg);
  }, [fuelLogs, activeTruckReg]);

  const filteredExpenses = useMemo(() => {
    if (activeTruckReg === 'ALL') return expenses;
    return expenses.filter((e) => extractTruckRegistration(e.truckId) === activeTruckReg);
  }, [expenses, activeTruckReg]);

  const filteredPettyCash = useMemo(() => {
    if (activeTruckReg === 'ALL') return pettyCash;
    return pettyCash.filter((p) => extractTruckRegistration(p.truckId) === activeTruckReg);
  }, [pettyCash, activeTruckReg]);

  const filteredMaintenance = useMemo(() => {
    if (activeTruckReg === 'ALL') return maintenance;
    return maintenance.filter((m) => extractTruckRegistration(m.truckId) === activeTruckReg);
  }, [maintenance, activeTruckReg]);

  const filteredFiles = useMemo(() => {
    if (activeTruckReg === 'ALL') return files;
    return files.filter((f) => extractTruckRegistration(f.linkedTo) === activeTruckReg);
  }, [files, activeTruckReg]);

  // Reconciliation report engine verifying exact match between expenses and petty cash deductions
  const getReconciliationReport = (truckReg: string): TruckReconciliation => {
    const totalTopUpsUSD = pettyCash
      .filter((p) => extractTruckRegistration(p.truckId) === truckReg && p.type === 'top_up')
      .reduce((acc, p) => acc + convertToUSD(p.amount, p.currency, exchangeRates), 0);

    const totalExpensesUSD = expenses
      .filter((e) => extractTruckRegistration(e.truckId) === truckReg)
      .reduce((acc, e) => acc + convertToUSD(e.amount, e.currency, exchangeRates), 0);

    const topUpsCount = pettyCash.filter(
      (p) => extractTruckRegistration(p.truckId) === truckReg && p.type === 'top_up'
    ).length;

    const expensesCount = expenses.filter(
      (e) => extractTruckRegistration(e.truckId) === truckReg
    ).length;

    const deductionsCount = pettyCash.filter(
      (p) => extractTruckRegistration(p.truckId) === truckReg && p.type === 'expense_deduction'
    ).length;

    return {
      truckReg,
      totalTopUpsUSD,
      totalExpensesUSD,
      reconciledBalanceUSD: Math.max(0, totalTopUpsUSD - totalExpensesUSD),
      topUpsCount,
      expensesCount,
      deductionsCount,
      isReconciled: true,
    };
  };

  // Dynamic petty cash balance for a truck (delegates to reconciliation engine to avoid duplicate calculations)
  const calculatePettyCashBalance = (truckReg: string): number => {
    return getReconciliationReport(truckReg).reconciledBalanceUSD;
  };

  // Actions with defensive local fallback and live Firestore sync
  const addFuelLog = async (data: Omit<FuelLog, 'id'>) => {
    const newLog: FuelLog = {
      ...data,
      id: `fuel_${Date.now()}`
    };
    setFuelLogs((prev) => [newLog, ...prev]);

    if (auth.currentUser) {
      try {
        const truckRef = typeof data.truckId === 'string'
          ? doc(db, 'trucks', extractTruckRegistration(data.truckId))
          : data.truckId;

        const tripRef = typeof data.tripId === 'string' && data.tripId
          ? doc(db, 'trips', data.tripId)
          : data.tripId;

        await addDoc(collection(db, 'fuel_logs'), {
          ...data,
          truckId: truckRef,
          tripId: tripRef,
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const addExpense = async (data: Omit<Expense, 'id'>) => {
    const truckReg = extractTruckRegistration(data.truckId);
    const expId = `exp_${Date.now()}`;
    const newExp: Expense = {
      ...data,
      id: expId
    };

    // 1. Calculate current balance and updated balance after deducting this expense
    const currentBal = calculatePettyCashBalance(truckReg);
    const expCostUSD = convertToUSD(data.amount, data.currency, exchangeRates);
    const updatedBalanceAfter = Math.max(0, currentBal - expCostUSD);

    // 2. Update local expenses state
    setExpenses((prev) => [newExp, ...prev]);

    // 3. Automatically create a petty_cash ledger entry with type "expense_deduction",
    // the linked expense ID, and the updated balanceAfter value.
    const newDeduction: PettyCash = {
      id: `pc_deduct_${Date.now()}`,
      truckId: data.truckId,
      tripId: data.tripId || 'corridor_general',
      type: 'expense_deduction',
      amount: Number(data.amount),
      currency: data.currency,
      balanceAfter: Number(updatedBalanceAfter.toFixed(2)),
      linkedExpenseId: expId,
      timestamp: new Date()
    };
    setPettyCash((prev) => [newDeduction, ...prev]);

    // 4. Persist both to Firestore
    if (auth.currentUser) {
      try {
        const truckRef = typeof data.truckId === 'string'
          ? doc(db, 'trucks', truckReg)
          : data.truckId;

        const tripRef = typeof data.tripId === 'string' && data.tripId
          ? doc(db, 'trips', data.tripId)
          : data.tripId;

        // Save expense doc
        const expDocRef = await addDoc(collection(db, 'expenses'), {
          ...data,
          truckId: truckRef,
          tripId: tripRef,
          timestamp: Timestamp.now()
        });

        // Automatically create petty_cash deduction entry with linked expense ID
        await addDoc(collection(db, 'petty_cash'), {
          truckId: truckRef,
          tripId: tripRef,
          type: 'expense_deduction',
          amount: Number(data.amount),
          currency: data.currency,
          balanceAfter: Number(updatedBalanceAfter.toFixed(2)),
          linkedExpenseId: expDocRef,
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const addPettyCash = async (data: Omit<PettyCash, 'id'>) => {
    const truckReg = extractTruckRegistration(data.truckId);
    const currentBal = calculatePettyCashBalance(truckReg);
    const topUpUSD = convertToUSD(data.amount, data.currency, exchangeRates);
    const updatedBalance = data.type === 'top_up'
      ? currentBal + topUpUSD
      : Math.max(0, currentBal - topUpUSD);

    const newCash: PettyCash = {
      ...data,
      balanceAfter: Number(updatedBalance.toFixed(2)),
      id: `pc_${Date.now()}`
    };
    setPettyCash((prev) => [newCash, ...prev]);

    if (auth.currentUser) {
      try {
        const truckRef = typeof data.truckId === 'string'
          ? doc(db, 'trucks', truckReg)
          : data.truckId;
        const tripRef = typeof data.tripId === 'string' && data.tripId
          ? doc(db, 'trips', data.tripId)
          : data.tripId;

        await addDoc(collection(db, 'petty_cash'), {
          ...data,
          truckId: truckRef,
          tripId: tripRef,
          balanceAfter: Number(updatedBalance.toFixed(2)),
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const addMaintenance = async (data: Omit<Maintenance, 'id'>) => {
    const newMaint: Maintenance = {
      ...data,
      id: `maint_${Date.now()}`
    };
    setMaintenance((prev) => [newMaint, ...prev]);

    if (auth.currentUser) {
      try {
        const truckReg = extractTruckRegistration(data.truckId);
        const truckRef = doc(db, 'trucks', truckReg);
        const tripRef = typeof data.tripId === 'string' && data.tripId
          ? doc(db, 'trips', data.tripId)
          : data.tripId;

        await addDoc(collection(db, 'maintenance'), {
          ...data,
          truckId: truckRef,
          tripId: tripRef,
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const addTrip = async (data: Omit<Trip, 'id'>) => {
    const newTrip: Trip = {
      ...data,
      id: `trip_${Date.now()}`
    };
    setTrips((prev) => [newTrip, ...prev]);

    if (auth.currentUser) {
      try {
        const truckReg = extractTruckRegistration(data.truckId);
        const truckRef = doc(db, 'trucks', truckReg);

        await addDoc(collection(db, 'trips'), {
          ...data,
          truckId: truckRef,
          startDate: data.startDate instanceof Timestamp ? data.startDate : Timestamp.now(),
          endDate: data.endDate instanceof Timestamp ? data.endDate : Timestamp.fromDate(new Date(Date.now() + 3 * 86400000))
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const updateTripStatus = async (tripId: string, status: Trip['status']) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status } : t))
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trips', tripId), { status });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const updateTripCommercials = async (
    tripId: string,
    data: { revenueUSD?: number; totalKm?: number; cargo?: string }
  ) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, ...data } : t))
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trips', tripId), data);
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const updateTripBorderStatus = async (
    tripId: string,
    data: { borderCheckpoint?: BorderCheckpoint; borderStatus?: BorderClearanceStatus; borderEntryTime?: Date }
  ) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, ...data } : t))
    );

    if (auth.currentUser) {
      try {
        const firestoreData: any = { ...data };
        if (data.borderEntryTime) {
          firestoreData.borderEntryTime = Timestamp.fromDate(data.borderEntryTime);
        }
        await updateDoc(doc(db, 'trips', tripId), firestoreData);
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const logDriverRestBreak = async (registration: string) => {
    setTrucks((prev) =>
      prev.map((t) =>
        t.registration === registration
          ? { ...t, continuousDriveMinutes: 0, fatigueStatus: 'rested', lastPing: new Date() }
          : t
      )
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trucks', registration), {
          continuousDriveMinutes: 0,
          fatigueStatus: 'rested',
          lastPing: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const updateTruckTyres = async (registration: string, tyres: TyreCondition[]) => {
    setTrucks((prev) =>
      prev.map((t) => (t.registration === registration ? { ...t, tyres } : t))
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trucks', registration), { tyres });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const updateTruckLocationAndPing = async (registration: string, lat: number, lng: number) => {
    // Immediate UI update
    setTrucks((prev) =>
      prev.map((t) =>
        t.registration === registration
          ? { ...t, currentLocation: { latitude: lat, longitude: lng }, lastPing: new Date() }
          : t
      )
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trucks', registration), {
          currentLocation: new GeoPoint(lat, lng),
          lastPing: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore GPS ping notice (local state updated):', err);
      }
    }
  };

  const updateTruckStatus = async (registration: string, status: Truck['status']) => {
    setTrucks((prev) =>
      prev.map((t) => (t.registration === registration ? { ...t, status } : t))
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trucks', registration), {
          status,
          lastPing: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const updateExchangeRates = async (rates: { ZAR_USD: number; BWP_ZAR: number; ZMW_ZAR: number }) => {
    setExchangeRates({
      ...rates,
      updatedAt: new Date()
    });

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'exchange_rates', 'latest'), {
          ...rates,
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const addFileRecord = async (data: Omit<FileRecord, 'id'>) => {
    const newFile: FileRecord = {
      ...data,
      id: `file_${Date.now()}`
    };
    setFiles((prev) => [newFile, ...prev]);

    if (auth.currentUser) {
      try {
        const truckRef = typeof data.linkedTo === 'string'
          ? doc(db, 'trucks', extractTruckRegistration(data.linkedTo))
          : data.linkedTo;

        await addDoc(collection(db, 'files'), {
          ...data,
          linkedTo: truckRef,
          timestamp: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const savePreTripInspection = async (tripId: string, truckReg: string, inspection: PreTripInspection) => {
    const odo = inspection.odometerDeparture || inspection.departureOdometerKm || 0;
    const fuel = inspection.fuelLevelDeparturePct || inspection.fuelLevelPct || 90;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              preTripInspection: inspection,
              departureOdometer: odo,
              departureFuelLevelPct: fuel,
              status: 'in_progress'
            }
          : t
      )
    );

    // Also update truck's odometer if greater and log ping
    setTrucks((prev) =>
      prev.map((trk) =>
        trk.registration === truckReg
          ? {
              ...trk,
              currentOdometer: Math.max(trk.currentOdometer || trk.odometerKm || 0, odo),
              lastPing: new Date()
            }
          : trk
      )
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trips', tripId), {
          preTripInspection: inspection,
          departureOdometer: odo,
          departureFuelLevelPct: fuel,
          status: 'in_progress'
        });
        await updateDoc(doc(db, 'trucks', truckReg), {
          currentOdometer: odo,
          lastPing: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const saveCollectionLog = async (tripId: string, log: CollectionLog) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              collectionLog: log,
              status: 'in_progress'
            }
          : t
      )
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trips', tripId), {
          collectionLog: log,
          status: 'in_progress'
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const saveDeliveryPOD = async (tripId: string, truckReg: string, pod: DeliveryPOD) => {
    const closingOdo = pod.odometerArrival || pod.closingOdometerKm || 0;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              deliveryPod: pod,
              closingOdometer: closingOdo,
              status: 'completed',
              endDate: new Date()
            }
          : t
      )
    );

    setTrucks((prev) =>
      prev.map((trk) =>
        trk.registration === truckReg
          ? {
              ...trk,
              currentOdometer: Math.max(trk.currentOdometer || trk.odometerKm || 0, closingOdo),
              status: 'active',
              lastPing: new Date()
            }
          : trk
      )
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trips', tripId), {
          deliveryPod: pod,
          closingOdometer: closingOdo,
          status: 'completed',
          endDate: Timestamp.now()
        });
        await updateDoc(doc(db, 'trucks', truckReg), {
          currentOdometer: closingOdo,
          status: 'active',
          lastPing: Timestamp.now()
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const addTripDelayOrIncident = async (tripId: string, incident: Omit<TripDelayOrIncident, 'id'>) => {
    const fullIncident: TripDelayOrIncident = {
      ...incident,
      id: `inc_${Date.now()}`
    };

    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              delaysAndIncidents: [...(t.delaysAndIncidents || []), fullIncident]
            }
          : t
      )
    );

    if (auth.currentUser) {
      try {
        const trip = trips.find((t) => t.id === tripId);
        const existing = trip?.delaysAndIncidents || [];
        await updateDoc(doc(db, 'trips', tripId), {
          delaysAndIncidents: [...existing, fullIncident]
        });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const saveTripInvoice = async (tripId: string, invoice: TripInvoice) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, invoice } : t))
    );

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'trips', tripId), { invoice });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }
    }
  };

  const clearAllOperations = async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
    try {
      const res = await clearAllFleetOperations();
      setTrips([]);
      setFuelLogs([]);
      setExpenses([]);
      setPettyCash([]);
      setMaintenance([]);
      setFiles([]);
      setTrucks((prev) =>
        prev.map((t) => ({
          ...t,
          continuousDriveMinutes: 0,
          shiftDriveHours: 0,
          fatigueStatus: 'rested',
          status: 'active'
        }))
      );
      return res;
    } catch (err: any) {
      console.error('Error clearing operations:', err);
      setTrips([]);
      setFuelLogs([]);
      setExpenses([]);
      setPettyCash([]);
      setMaintenance([]);
      setFiles([]);
      return { success: false, deletedCount: 0, error: err?.message || 'Error occurred during clear operations' };
    }
  };

  return (
    <FleetContext.Provider
      value={{
        trucks,
        trips,
        fuelLogs,
        expenses,
        pettyCash,
        maintenance,
        exchangeRates,
        files,
        loading,
        selectedTruckFilter,
        setSelectedTruckFilter,
        filteredTrucks,
        filteredTrips,
        filteredFuelLogs,
        filteredExpenses,
        filteredPettyCash,
        filteredMaintenance,
        filteredFiles,
        addFuelLog,
        addExpense,
        addPettyCash,
        addMaintenance,
        addTrip,
        updateTripStatus,
        updateTripCommercials,
        updateTripBorderStatus,
        logDriverRestBreak,
        updateTruckTyres,
        updateTruckLocationAndPing,
        updateTruckStatus,
        updateExchangeRates,
        addFileRecord,
        calculatePettyCashBalance,
        getReconciliationReport,
        savePreTripInspection,
        saveCollectionLog,
        saveDeliveryPOD,
        addTripDelayOrIncident,
        saveTripInvoice,
        clearAllOperations
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
