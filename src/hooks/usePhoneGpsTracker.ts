import { useState, useEffect, useRef, useCallback } from 'react';
import { useFleet } from '../context/FleetContext';
import { doc, updateDoc, Timestamp, GeoPoint } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface PhoneGpsState {
  isActive: boolean;
  isTransmitting: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  speedKmh: number | null;
  heading: number | null;
  lastPing: Date | null;
  milestone: string;
  source: 'hardware_phone_gps' | 'simulated_corridor' | 'idle';
  error: string | null;
  isStationary: boolean;
  stationaryMinutes: number;
  stationaryAlertTriggered: boolean;
}

// Key Waypoints along the primary SA/ZIM freight corridor (Pomona Depot -> Beitbridge -> Harare)
const CORRIDOR_MILESTONES = [
  { name: 'Pomona Commercial Depot, Kempton Park, SA', lat: -26.1154, lng: 28.2713 },
  { name: 'Passing Pretoria N1 Carousel Toll Plaza', lat: -25.5684, lng: 28.2864 },
  { name: 'Passing Kranskop Toll Plaza, Modimolle', lat: -24.7183, lng: 28.5521 },
  { name: 'Passing Polokwane Central Corridor Bypass', lat: -23.9045, lng: 29.4688 },
  { name: 'Passing Makhado (Louis Trichardt) Rest Stop', lat: -23.0462, lng: 29.9048 },
  { name: 'Approaching Musina Weighbridge Inspection Bay', lat: -22.3481, lng: 30.0412 },
  { name: 'Arrived at Beitbridge Border Customs Queue', lat: -22.2175, lng: 30.0003 },
  { name: 'Entering Beitbridge Commercial Cargo Terminal, ZIM', lat: -22.2112, lng: 29.9912 },
  { name: 'Passing Bubi River Rest Camp, Masvingo Corridor', lat: -21.4124, lng: 30.3421 },
  { name: 'Entering Harare Southern Freight Bypass, ZIM', lat: -17.8252, lng: 31.0335 }
];

export function usePhoneGpsTracker(
  truckRegistration: string,
  driverName: string,
  driverPhone?: string,
  enabledByDefault: boolean = true
) {
  const { updateTruckLocationAndPing } = useFleet();

  const [gpsState, setGpsState] = useState<PhoneGpsState>({
    isActive: enabledByDefault,
    isTransmitting: false,
    latitude: -26.1154,
    longitude: 28.2713,
    accuracyMeters: 6,
    speedKmh: 74,
    heading: 18,
    lastPing: new Date(),
    milestone: 'Pomona Commercial Depot, Kempton Park, SA',
    source: 'idle',
    error: null,
    isStationary: false,
    stationaryMinutes: 0,
    stationaryAlertTriggered: false
  });

  const watchIdRef = useRef<number | null>(null);
  const simStepRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);
  const stationarySinceRef = useRef<number | null>(null);
  const dismissedAlertRef = useRef<boolean>(false);

  // Broadcast telematics to Firestore and Context
  const broadcastLocation = useCallback(
    async (
      lat: number,
      lng: number,
      accuracy: number = 8,
      speed: number = 70,
      heading: number = 0,
      isHardwareGps: boolean = true,
      customStationaryMinutes?: number
    ) => {
      setGpsState((prev) => ({
        ...prev,
        isTransmitting: true
      }));

      // Calculate stationary status
      const isStill = speed < 5;
      let calculatedStationaryMins = 0;

      if (customStationaryMinutes !== undefined) {
        calculatedStationaryMins = customStationaryMinutes;
        if (customStationaryMinutes > 0) {
          stationarySinceRef.current = Date.now() - customStationaryMinutes * 60 * 1000;
        } else {
          stationarySinceRef.current = null;
        }
      } else if (isStill) {
        if (!stationarySinceRef.current) {
          stationarySinceRef.current = Date.now();
        }
        calculatedStationaryMins = Math.floor((Date.now() - stationarySinceRef.current) / 60000);
      } else {
        stationarySinceRef.current = null;
        dismissedAlertRef.current = false;
        calculatedStationaryMins = 0;
      }

      // 30 minute stationary threshold alert trigger
      const alertTriggered = calculatedStationaryMins >= 30 && !dismissedAlertRef.current;

      // Find closest milestone description
      let closestMilestone = 'N1 Freight Corridor en route';
      let minDistance = Infinity;
      for (const m of CORRIDOR_MILESTONES) {
        const dist = Math.hypot(m.lat - lat, m.lng - lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestMilestone = m.name;
        }
      }

      // Update local fleet context
      updateTruckLocationAndPing(truckRegistration, lat, lng);

      // Update state
      setGpsState((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
        speedKmh: Math.round(speed),
        heading: Math.round(heading),
        lastPing: new Date(),
        milestone: closestMilestone,
        source: isHardwareGps ? 'hardware_phone_gps' : 'simulated_corridor',
        isTransmitting: false,
        error: null,
        isStationary: isStill,
        stationaryMinutes: calculatedStationaryMins,
        stationaryAlertTriggered: alertTriggered
      }));

      // Update Firestore truck telematics directly
      if (auth.currentUser && truckRegistration) {
        try {
          const truckRef = doc(db, 'trucks', truckRegistration);
          await updateDoc(truckRef, {
            currentLocation: new GeoPoint(lat, lng),
            lastPing: Timestamp.now(),
            driverPhone: driverPhone || '+27 82 555 0192',
            phoneGpsTelemetry: {
              latitude: lat,
              longitude: lng,
              accuracyMeters: Math.round(accuracy),
              speedKmh: Math.round(speed),
              heading: Math.round(heading),
              pingedFromPhone: true,
              driverPhone: driverPhone || '+27 82 555 0192',
              driverName: driverName || 'Driver',
              milestone: closestMilestone,
              isStationary: isStill,
              stationaryMinutes: calculatedStationaryMins,
              stationaryAlertTriggered: alertTriggered,
              timestamp: Timestamp.now()
            }
          });
        } catch (err) {
          console.warn('Firestore phone GPS broadcast note:', err);
        }
      }
    },
    [truckRegistration, driverName, driverPhone, updateTruckLocationAndPing]
  );

  // Step simulation forward along the corridor (for testing / demo or fallback)
  const advanceSimulatedRoute = useCallback(() => {
    simStepRef.current = (simStepRef.current + 1) % CORRIDOR_MILESTONES.length;
    const waypoint = CORRIDOR_MILESTONES[simStepRef.current];
    // Add small realistic jitter
    const jitterLat = waypoint.lat + (Math.random() - 0.5) * 0.005;
    const jitterLng = waypoint.lng + (Math.random() - 0.5) * 0.005;
    broadcastLocation(jitterLat, jitterLng, 6 + Math.floor(Math.random() * 5), 68 + Math.floor(Math.random() * 15), 180, false, 0);
  }, [broadcastLocation]);

  // Simulate stationary duration helper for instant testing (e.g. 35 minutes)
  const simulateStationaryTime = useCallback((mins: number = 35) => {
    dismissedAlertRef.current = false;
    stationarySinceRef.current = Date.now() - mins * 60 * 1000;
    const currentLat = gpsState.latitude || -22.2175;
    const currentLng = gpsState.longitude || 30.0003;
    broadcastLocation(currentLat, currentLng, 4, 0, gpsState.heading || 0, false, mins);
  }, [gpsState.latitude, gpsState.longitude, gpsState.heading, broadcastLocation]);

  // Reset stationary timer (e.g., driver begins driving or logs rest break)
  const resetStationaryTimer = useCallback(() => {
    stationarySinceRef.current = null;
    dismissedAlertRef.current = false;
    setGpsState((prev) => ({
      ...prev,
      isStationary: false,
      stationaryMinutes: 0,
      stationaryAlertTriggered: false
    }));
  }, []);

  // Dismiss alert toast without zeroing the minutes
  const dismissStationaryAlert = useCallback(() => {
    dismissedAlertRef.current = true;
    setGpsState((prev) => ({
      ...prev,
      stationaryAlertTriggered: false
    }));
  }, []);

  // Request single manual ping from phone GPS
  const pingPhoneGpsNow = useCallback(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed, heading } = pos.coords;
          const speedKmh = speed ? speed * 3.6 : 72;
          broadcastLocation(latitude, longitude, Math.round(accuracy || 8), speedKmh, heading || 0, true);
        },
        () => {
          // Fall back seamlessly to next corridor waypoint
          advanceSimulatedRoute();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    } else {
      advanceSimulatedRoute();
    }
  }, [broadcastLocation, advanceSimulatedRoute]);

  // Active watching lifecycle
  useEffect(() => {
    if (!gpsState.isActive) {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let hasNativeGps = false;

    // Gracefully query permissions if supported to avoid browser gesture violation warnings
    const startGeolocationWatch = () => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              hasNativeGps = true;
              const { latitude, longitude, accuracy, speed, heading } = pos.coords;
              const speedKmh = speed ? speed * 3.6 : 0;
              broadcastLocation(latitude, longitude, Math.round(accuracy || 8), speedKmh, heading || 0, true);
            },
            () => {
              hasNativeGps = false;
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        } catch {
          hasNativeGps = false;
        }
      }
    };

    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          startGeolocationWatch();
        } else if (result.state === 'prompt') {
          startGeolocationWatch();
        }
      }).catch(() => {
        startGeolocationWatch();
      });
    } else {
      startGeolocationWatch();
    }

    // Periodic heartbeat ping every 25 seconds
    intervalRef.current = setInterval(() => {
      if (gpsState.isActive) {
        if (!hasNativeGps) {
          // If vehicle is stationary, advance stationary time counter
          if (stationarySinceRef.current) {
            const elapsedMins = Math.floor((Date.now() - stationarySinceRef.current) / 60000);
            setGpsState((prev) => ({
              ...prev,
              stationaryMinutes: elapsedMins,
              stationaryAlertTriggered: elapsedMins >= 30 && !dismissedAlertRef.current
            }));
          } else {
            advanceSimulatedRoute();
          }
        }
      }
    }, 25000);

    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [gpsState.isActive, broadcastLocation, advanceSimulatedRoute]);

  const toggleGpsTracking = () => {
    setGpsState((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  return {
    gpsState,
    toggleGpsTracking,
    pingPhoneGpsNow,
    advanceSimulatedRoute,
    simulateStationaryTime,
    resetStationaryTimer,
    dismissStationaryAlert
  };
}
