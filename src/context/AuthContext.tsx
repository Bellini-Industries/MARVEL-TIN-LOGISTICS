import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider, testConnection } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { initializeFleetDatabase } from '../services/seedService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  currentRole: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAccountant: boolean;
  isDispatcher: boolean;
  isDriver: boolean;
  canAccessFinancials: boolean;
  canAccessOperations: boolean;
  assignedTruck: string | null;
  assignedDriverName: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchRoleOrTruck: (role: UserRole, truck?: 'JRB 216MP' | 'KBR 813MP', driverName?: string) => Promise<void>;
  setDemoUser: (role: UserRole, truck?: 'JRB 216MP' | 'KBR 813MP', driverName?: string) => void;
  signUpDriverWithPhone: (params: {
    phoneNumber: string;
    name: string;
    truckId: string;
    prdpNumber?: string;
    prdpExpiryDate?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signInDriverWithPhone: (
    phoneNumber: string,
    otpCode: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['swedyj16@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Test basic connection on startup
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Run database seeding safely only when user is authenticated
        try {
          await initializeFleetDatabase();
        } catch (e) {
          console.warn('Initial seed check:', e);
        }

        try {
          // Read from 'users' collection per Requirement 2 (with fallback check to user_profiles)
          const userRef = doc(db, 'users', currentUser.uid);
          let snap = await getDoc(userRef);

          if (!snap.exists()) {
            const legacyProfileRef = doc(db, 'user_profiles', currentUser.uid);
            const legacySnap = await getDoc(legacyProfileRef);
            if (legacySnap.exists()) {
              snap = legacySnap;
            }
          }

          if (snap.exists()) {
            const data = snap.data();
            setProfile({
              uid: data.uid || currentUser.uid,
              email: data.email || currentUser.email || '',
              name: data.name || currentUser.displayName || 'Fleet Member',
              role: (data.role as 'admin' | 'driver') || 'driver',
              assignedTruck: data.assignedTruck,
              assignedDriverName: data.assignedDriverName
            });
          } else {
            // Initial user document creation in the "users" collection
            const isDefaultAdmin = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || (isDefaultAdmin ? 'Fleet Administrator' : 'Fleet Member'),
              role: isDefaultAdmin ? 'admin' : 'driver',
              assignedTruck: isDefaultAdmin ? undefined : 'JRB 216MP',
              assignedDriverName: isDefaultAdmin ? undefined : 'Tichaona'
            };

            const userDocPayload = {
              uid: newProfile.uid,
              email: newProfile.email,
              role: newProfile.role,
              assignedTruck: newProfile.assignedTruck || null,
              name: newProfile.name,
              assignedDriverName: newProfile.assignedDriverName || null,
              updatedAt: Timestamp.now()
            };

            await setDoc(userRef, userDocPayload);

            // Also maintain backwards compatibility mirror in user_profiles
            try {
              await setDoc(doc(db, 'user_profiles', currentUser.uid), userDocPayload);
            } catch (mirrorErr) {
              console.warn('Mirror user_profile notice:', mirrorErr);
            }

            setProfile(newProfile);
          }
        } catch (err) {
          console.warn('Could not fetch user record from users collection:', err);
          const isDefaultAdmin = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase() || '');
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            name: currentUser.displayName || 'Fleet User',
            role: isDefaultAdmin ? 'admin' : 'driver',
            assignedTruck: isDefaultAdmin ? undefined : 'JRB 216MP',
            assignedDriverName: isDefaultAdmin ? undefined : 'Tichaona'
          });
        }
      } else {
        // Auto-activate demo workspace if no Google session and not explicitly signed out
        const isExplicitSignOut = localStorage.getItem('marvel_explicit_signout') === 'true';
        if (!isExplicitSignOut) {
          const storedRole = (localStorage.getItem('marvel_auth_role') as 'admin' | 'driver') || 'admin';
          const storedTruck = (localStorage.getItem('marvel_auth_truck') as 'JRB 216MP' | 'KBR 813MP') || 'JRB 216MP';
          const storedDriver = localStorage.getItem('marvel_auth_driver') || (storedTruck === 'KBR 813MP' ? 'Anthony' : 'Tichaona');
          
          const defaultUid = storedRole === 'admin' ? 'demo_admin_uid' : `demo_driver_${storedTruck.split(' ')[0]}`;
          const defaultUser: any = {
            uid: defaultUid,
            email: storedRole === 'admin' ? 'swedyj16@gmail.com' : `${storedDriver.toLowerCase()}@marvel-tin.com`,
            displayName: storedRole === 'admin' ? 'Fleet Administrator' : `Driver ${storedDriver}`,
            photoURL: null
          };
          const defaultProfile: UserProfile = {
            uid: defaultUid,
            email: defaultUser.email,
            name: defaultUser.displayName,
            role: storedRole,
            assignedTruck: storedRole === 'driver' ? storedTruck : undefined,
            assignedDriverName: storedRole === 'driver' ? storedDriver : undefined
          };

          setUser(defaultUser);
          setProfile(defaultProfile);
          
          // Trigger initial seed check safely
          initializeFleetDatabase().catch((e) => console.warn('Initial seed check:', e));
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      localStorage.removeItem('marvel_explicit_signout');
      return { success: true };
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.warn('Google sign-in popup was dismissed.');
        return {
          success: false,
          error: 'Sign-in window was closed. You can try again or use Instant Access below.'
        };
      }
      console.warn('Google Sign-In notice:', error?.message);
      return {
        success: false,
        error: error?.message || 'Google Sign-In was blocked or unavailable.'
      };
    }
  };

  const signOut = async () => {
    try {
      localStorage.setItem('marvel_explicit_signout', 'true');
      await fbSignOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.warn('Sign Out notice:', error);
      setUser(null);
      setProfile(null);
    }
  };

  const setDemoUser = (role: UserRole, truck?: 'JRB 216MP' | 'KBR 813MP', driverName?: string) => {
    localStorage.removeItem('marvel_explicit_signout');
    localStorage.setItem('marvel_auth_role', role);
    if (truck) localStorage.setItem('marvel_auth_truck', truck);
    if (driverName) localStorage.setItem('marvel_auth_driver', driverName);

    const mockUid = role === 'admin' ? 'demo_admin_uid' : (role === 'accountant' ? 'demo_accountant_uid' : (role === 'dispatcher' ? 'demo_dispatcher_uid' : `demo_driver_${truck?.split(' ')[0] || 'jrb'}`));
    const mockEmail = role === 'admin'
      ? 'swedyj16@gmail.com'
      : (role === 'accountant' ? 'accounts@marvel-tin.com' : (role === 'dispatcher' ? 'dispatch@marvel-tin.com' : `${driverName?.toLowerCase() || 'driver'}@marvel-tin.com`));
    const mockName = role === 'admin'
      ? 'Fleet Administrator'
      : (role === 'accountant' ? 'Senior Fleet Accountant' : (role === 'dispatcher' ? 'Operations Dispatcher' : `Driver ${driverName || 'Operator'}`));

    const mockUser: any = {
      uid: mockUid,
      email: mockEmail,
      displayName: mockName,
      photoURL: null
    };

    const mockProfile: UserProfile = {
      uid: mockUid,
      email: mockUser.email,
      name: mockUser.displayName,
      role,
      assignedTruck: role === 'driver' ? truck || 'JRB 216MP' : undefined,
      assignedDriverName: role === 'driver' ? driverName || (truck === 'KBR 813MP' ? 'Anthony' : 'Tichaona') : undefined
    };

    setUser(mockUser);
    setProfile(mockProfile);
  };

  const switchRoleOrTruck = async (role: UserRole, truck?: 'JRB 216MP' | 'KBR 813MP', driverName?: string) => {
    if (!user) return;
    localStorage.setItem('marvel_auth_role', role);
    if (truck) localStorage.setItem('marvel_auth_truck', truck);
    if (driverName) localStorage.setItem('marvel_auth_driver', driverName);

    const updatedRoleName = role === 'admin'
      ? 'Fleet Administrator'
      : (role === 'accountant' ? 'Senior Fleet Accountant' : (role === 'dispatcher' ? 'Operations Dispatcher' : `Driver ${driverName || (truck === 'KBR 813MP' ? 'Anthony' : 'Tichaona')}`));

    const updated: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      name: isSuperAdmin ? updatedRoleName : (user.displayName || updatedRoleName),
      role,
      assignedTruck: role === 'driver' ? truck || 'JRB 216MP' : undefined,
      assignedDriverName: role === 'driver' ? driverName || (truck === 'KBR 813MP' ? 'Anthony' : 'Tichaona') : undefined
    };

    setProfile(updated);

    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const payload = {
          uid: updated.uid,
          email: updated.email,
          role: updated.role,
          assignedTruck: updated.assignedTruck || null,
          name: updated.name,
          assignedDriverName: updated.assignedDriverName || null,
          updatedAt: Timestamp.now()
        };
        await setDoc(userDocRef, payload, { merge: true });

        // Maintain mirror for backwards compatibility
        try {
          const profileRef = doc(db, 'user_profiles', user.uid);
          await setDoc(profileRef, payload, { merge: true });
        } catch (mErr) {
          console.warn('Mirror update notice:', mErr);
        }
      } catch (err) {
        console.warn('Could not persist updated profile to users collection (local state updated):', err);
      }
    }
  };

  const signUpDriverWithPhone = async (params: {
    phoneNumber: string;
    name: string;
    truckId: string;
    prdpNumber?: string;
    prdpExpiryDate?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanPhone = params.phoneNumber.trim().replace(/\s+/g, '');
      const uid = `driver_phone_${cleanPhone.replace(/[^0-9]/g, '')}`;

      const newProfile: UserProfile = {
        uid,
        email: `${cleanPhone}@driver.marvel-tin.com`,
        name: params.name.trim() || 'Driver',
        role: 'driver',
        assignedTruck: params.truckId,
        assignedDriverName: params.name.trim() || 'Driver',
        phoneNumber: cleanPhone,
        prdpNumber: params.prdpNumber,
        prdpExpiryDate: params.prdpExpiryDate,
        phoneGpsEnabled: true
      };

      const mockUser: any = {
        uid,
        email: newProfile.email,
        displayName: newProfile.name,
        phoneNumber: cleanPhone,
        photoURL: null
      };

      localStorage.setItem('marvel_auth_role', 'driver');
      localStorage.setItem('marvel_auth_truck', params.truckId);
      localStorage.setItem('marvel_auth_driver', newProfile.name);
      localStorage.setItem('marvel_auth_phone', cleanPhone);
      localStorage.removeItem('marvel_explicit_signout');

      setUser(mockUser);
      setProfile(newProfile);

      try {
        await setDoc(doc(db, 'users', uid), {
          ...newProfile,
          updatedAt: Timestamp.now()
        }, { merge: true });

        await setDoc(doc(db, 'trucks', params.truckId), {
          driver: newProfile.name,
          driverPhone: cleanPhone,
          lastPing: Timestamp.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore write notice (local state maintained):', err);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Driver signup failed' };
    }
  };

  const signInDriverWithPhone = async (
    phoneNumber: string,
    otpCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        return { success: false, error: 'Please enter a valid phone number.' };
      }

      const uid = `driver_phone_${cleanPhone.replace(/[^0-9]/g, '')}`;
      const isAnthony = cleanPhone.includes('83') || cleanPhone.includes('444');
      const truckId = isAnthony ? 'KBR 813MP' : 'JRB 216MP';
      const driverName = isAnthony ? 'Anthony Mthembu' : 'Tichaona Ndlovu';

      let existingProfile: UserProfile | null = null;
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          existingProfile = snap.data() as UserProfile;
        }
      } catch (e) {
        console.warn('Lookup notice:', e);
      }

      const activeProfile: UserProfile = existingProfile || {
        uid,
        email: `${cleanPhone}@driver.marvel-tin.com`,
        name: driverName,
        role: 'driver',
        assignedTruck: truckId,
        assignedDriverName: driverName,
        phoneNumber: cleanPhone,
        phoneGpsEnabled: true
      };

      const mockUser: any = {
        uid,
        email: activeProfile.email,
        displayName: activeProfile.name,
        phoneNumber: cleanPhone,
        photoURL: null
      };

      localStorage.setItem('marvel_auth_role', 'driver');
      localStorage.setItem('marvel_auth_truck', activeProfile.assignedTruck || truckId);
      localStorage.setItem('marvel_auth_driver', activeProfile.name);
      localStorage.setItem('marvel_auth_phone', cleanPhone);
      localStorage.removeItem('marvel_explicit_signout');

      setUser(mockUser);
      setProfile(activeProfile);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Phone sign-in failed' };
    }
  };

  const isSuperAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const currentRole: UserRole = profile?.role || (isSuperAdmin ? 'admin' : 'driver');

  const isAdmin = currentRole === 'admin';
  const isAccountant = currentRole === 'accountant';
  const isDispatcher = currentRole === 'dispatcher';
  const isDriver = currentRole === 'driver';

  const canAccessFinancials = isAdmin || isAccountant;
  const canAccessOperations = isAdmin || isDispatcher;

  const assignedTruck = isDriver ? (profile?.assignedTruck || 'JRB 216MP') : null;
  const assignedDriverName = isDriver ? (profile?.assignedDriverName || 'Tichaona') : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentRole,
        isSuperAdmin,
        isAdmin,
        isAccountant,
        isDispatcher,
        isDriver,
        canAccessFinancials,
        canAccessOperations,
        assignedTruck,
        assignedDriverName,
        loading,
        signInWithGoogle,
        signOut,
        switchRoleOrTruck,
        setDemoUser,
        signUpDriverWithPhone,
        signInDriverWithPhone
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
