import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDocFromServer,
  GeoPoint,
  Timestamp,
  collection,
  DocumentReference
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { compressImage, isImageFile, readFileAsDataUrl } from './utils/mediaOptimizer';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Offline Persistence enabled for drivers logging without network
// Enable auto-detect long polling to prevent WebChannel 10-second backend connection timeouts in cloud/proxy environments
function initFirestoreWithPersistence() {
  const dbId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);
  } catch (err: any) {
    console.info('Firestore offline persistence fallback notice:', err?.message);
    try {
      return getFirestore(app, dbId);
    } catch {
      return getFirestore(app);
    }
  }
}

// CRITICAL: Database instance with offline IndexedDB persistence
export const db = initFirestoreWithPersistence();
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Operation Types for strict error logging per guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Timeout helper preventing long-hanging operations (e.g. Firebase SDK retry backoff of 120s)
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 4500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Connection test on boot per guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 3500);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firebase client operating in offline mode with IndexedDB persistence.');
      return false;
    }
    // If permission denied or document not found or timed out, connection is handled gracefully
    return true;
  }
}

/**
 * Upload a receipt (PDF or Image) for Fuel to Firebase Storage and retrieve the download URL.
 * Automatically compresses large camera photos client-side to ~200KB before upload,
 * and falls back to compressed data URL with a 4.5s timeout.
 */
export async function uploadPdfReceipt(file: File, truckReg: string): Promise<string> {
  const sanitizedReg = truckReg.replace(/\s+/g, '_');
  const timestamp = Date.now();

  let uploadFile: File = file;
  let fallbackDataUrl = '';

  if (isImageFile(file)) {
    try {
      const comp = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
      uploadFile = comp.file;
      fallbackDataUrl = comp.dataUrl;
    } catch {
      uploadFile = file;
    }
  }

  const cleanFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `fuel_receipts/${sanitizedReg}/${timestamp}_${cleanFileName}`;
  const contentType = uploadFile.type || (cleanFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(storageRef, uploadFile, {
        contentType,
        customMetadata: {
          truck: truckReg,
          category: 'fuel',
          uploadedAt: new Date().toISOString()
        }
      }),
      4500
    );
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage fast fallback note (fuel receipt):', storageError);
    if (fallbackDataUrl) return fallbackDataUrl;
    return readFileAsDataUrl(uploadFile);
  }
}

/**
 * Upload a PDF or Image receipt to Firebase Storage for expenses and retrieve the download URL.
 * Automatically compresses large camera photos client-side to ~200KB before upload,
 * with a 4.5s timeout fallback.
 */
export async function uploadExpenseReceipt(file: File, truckReg: string): Promise<string> {
  const sanitizedReg = truckReg.replace(/\s+/g, '_');
  const timestamp = Date.now();

  let uploadFile: File = file;
  let fallbackDataUrl = '';

  if (isImageFile(file)) {
    try {
      const comp = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
      uploadFile = comp.file;
      fallbackDataUrl = comp.dataUrl;
    } catch {
      uploadFile = file;
    }
  }

  const cleanFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `expense_receipts/${sanitizedReg}/${timestamp}_${cleanFileName}`;
  const contentType = uploadFile.type || (cleanFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(storageRef, uploadFile, {
        contentType,
        customMetadata: {
          truck: truckReg,
          category: 'expense',
          uploadedAt: new Date().toISOString()
        }
      }),
      4500
    );
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage fast fallback note (expense receipt):', storageError);
    if (fallbackDataUrl) return fallbackDataUrl;
    return readFileAsDataUrl(uploadFile);
  }
}

/**
 * Upload a PDF receipt or photo to Firebase Storage for truck maintenance/repairs.
 * Includes client-side compression and 4.5s timeout fallback.
 */
export async function uploadMaintenanceReceipt(file: File, truckReg: string): Promise<string> {
  const sanitizedReg = truckReg.replace(/\s+/g, '_');
  const timestamp = Date.now();

  let uploadFile: File = file;
  let fallbackDataUrl = '';

  if (isImageFile(file)) {
    try {
      const comp = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
      uploadFile = comp.file;
      fallbackDataUrl = comp.dataUrl;
    } catch {
      uploadFile = file;
    }
  }

  const cleanFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `maintenance_receipts/${sanitizedReg}/${timestamp}_${cleanFileName}`;
  const contentType = uploadFile.type || (cleanFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(storageRef, uploadFile, {
        contentType,
        customMetadata: {
          truck: truckReg,
          category: 'maintenance',
          uploadedAt: new Date().toISOString()
        }
      }),
      4500
    );
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage fast fallback note (maintenance receipt):', storageError);
    if (fallbackDataUrl) return fallbackDataUrl;
    return readFileAsDataUrl(uploadFile);
  }
}

/**
 * Upload a fleet document, POD slip, or customs clearance file to Firebase Storage.
 * Auto-compresses image documents and provides snappy 4.5s timeout.
 */
export async function uploadFleetDocument(file: File, truckReg: string): Promise<string> {
  const sanitizedReg = truckReg.replace(/\s+/g, '_');
  const timestamp = Date.now();

  let uploadFile: File = file;
  let fallbackDataUrl = '';

  if (isImageFile(file)) {
    try {
      const comp = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
      uploadFile = comp.file;
      fallbackDataUrl = comp.dataUrl;
    } catch {
      uploadFile = file;
    }
  }

  const cleanFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `documents/${sanitizedReg}/${timestamp}_${cleanFileName}`;
  const contentType = uploadFile.type || (cleanFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(storageRef, uploadFile, {
        contentType,
        customMetadata: {
          truck: truckReg,
          category: 'document',
          uploadedAt: new Date().toISOString()
        }
      }),
      4500
    );
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage direct upload note (falling back to Data URL representation):', storageError);
    if (fallbackDataUrl) return fallbackDataUrl;
    return readFileAsDataUrl(uploadFile);
  }
}

/**
 * Upload an Excel report (.xlsx) to Firebase Storage and retrieve the download URL.
 * Includes graceful fallback with 4.5s timeout.
 */
export async function uploadExcelReport(blob: Blob, fileName: string): Promise<string> {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `accounting_reports/${Date.now()}_${cleanFileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await withTimeout(
      uploadBytes(storageRef, blob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        customMetadata: {
          reportType: 'Accounting Excel Report',
          uploadedAt: new Date().toISOString()
        }
      }),
      4500
    );
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage direct upload note (falling back to Data URL representation):', storageError);
    return readFileAsDataUrl(blob);
  }
}

export { GeoPoint, Timestamp };
