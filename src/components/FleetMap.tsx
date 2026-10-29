import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { Truck } from '../types';
import { formatDateTime } from '../utils/helpers';
import { Navigation, Compass, Truck as TruckIcon, Layers, Smartphone, Radio, Phone, ShieldCheck, Gauge } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { useTheme } from '../context/ThemeContext';

interface FleetMapProps {
  trucks?: Truck[];
  onSelectTruck?: (reg: string) => void;
  onUpdateLocation?: (reg: string, lat: number, lng: number) => void;
  canEditLocation?: boolean;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCK-MmCpQKpj-J58wkbLfp64ldPeL737CA';

// Freight corridor route coordinates
const corridorPath = [
  { lat: -15.3875, lng: 28.3228 }, // Lusaka (ZAM)
  { lat: -16.0333, lng: 28.8500 }, // Chirundu Border Post (ZIM/ZAM)
  { lat: -17.8252, lng: 31.0335 }, // Harare Operations Depot (ZIM)
  { lat: -20.1500, lng: 28.5833 }, // Bulawayo Hub (ZIM)
  { lat: -22.2167, lng: 29.9833 }, // Beitbridge Commercial Border (ZIM/SA)
  { lat: -23.9045, lng: 29.4688 }, // Polokwane N1 (SA)
  { lat: -26.2041, lng: 28.0473 }, // Johannesburg Logistics Park (SA)
  { lat: -29.8587, lng: 31.0218 }, // Durban Container Terminal Port (SA)
];

const waypoints = [
  { name: 'Kamativi Tin Mine (ZIM)', lat: -18.3167, lng: 27.0500, type: 'mine' },
  { name: 'Harare Depot (ZIM)', lat: -17.8252, lng: 31.0335, type: 'depot' },
  { name: 'Beitbridge Border (ZIM/SA)', lat: -22.2167, lng: 29.9833, type: 'border' },
  { name: 'Johannesburg Hub (SA)', lat: -26.2041, lng: 28.0473, type: 'hub' },
  { name: 'Chirundu Border (ZIM/ZAM)', lat: -16.0333, lng: 28.8500, type: 'border' },
  { name: 'Lusaka Depot (ZAM)', lat: -15.3875, lng: 28.3228, type: 'city' },
  { name: 'Durban Port Terminal (SA)', lat: -29.8587, lng: 31.0218, type: 'port' },
];

// Helper to draw corridor polyline on Google Map
const CorridorPolyline: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    if (!map || !(window as any).google?.maps?.Polyline) return;
    const polyline = new (window as any).google.maps.Polyline({
      path: corridorPath,
      geodesic: true,
      strokeColor: '#f59e0b',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    });
    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map]);

  return null;
};

export const FleetMap: React.FC<FleetMapProps> = ({
  trucks: propTrucks,
  onSelectTruck,
  onUpdateLocation,
  canEditLocation
}) => {
  const { filteredTrucks: contextTrucks } = useFleet();
  const { isDark } = useTheme();
  const trucks = propTrucks || contextTrucks;
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('hybrid');

  const quickLocations = [
    { label: 'Beitbridge Border (ZIM)', lat: -22.2167, lng: 29.9833 },
    { label: 'Harare Depot (ZIM)', lat: -17.8252, lng: 31.0335 },
    { label: 'Johannesburg Hub (SA)', lat: -26.2041, lng: 28.0473 },
    { label: 'Chirundu Border (ZAM)', lat: -16.0333, lng: 28.8500 },
    { label: 'Durban Port (SA)', lat: -29.8587, lng: 31.0218 },
  ];

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border shadow-sm transition-colors ${
      isDark ? 'border-[#1b2b4f] bg-[#0d162d]' : 'border-slate-200 bg-white'
    }`}>
      {/* Top Map Toolbar */}
      <div className={`absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2.5 backdrop-blur-md px-3.5 py-2 rounded-xl border shadow-md text-xs transition-colors ${
        isDark ? 'bg-[#0b1329]/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center space-x-1.5 font-bold text-blue-500">
          <Navigation className="w-3.5 h-3.5" />
          <span>Google Maps Telemetry</span>
        </div>
        <div className={`h-3 w-px mx-1 hidden sm:block ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
        <div className={`flex items-center space-x-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>JRB 216MP</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>KBR 813MP</span>
          </span>
        </div>
      </div>

      {/* Map style toggle button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer shadow-md transition-colors ${
            isDark
              ? 'bg-[#111c38] hover:bg-[#18274d] text-white border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
          }`}
          title="Toggle Satellite / Hybrid"
        >
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span className="capitalize">{mapType === 'roadmap' ? 'Satellite' : 'Roads'}</span>
        </button>
      </div>

      {/* Map Container with explicit height per CF2 */}
      <div className="w-full h-[380px] md:h-[440px]">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            defaultCenter={{ lat: -21.5, lng: 29.5 }}
            defaultZoom={6}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            style={{ width: '100%', height: '100%' }}
          >
            <CorridorPolyline />

            {/* Waypoints along Southern African corridor */}
            {waypoints.map((wp) => (
              <AdvancedMarker
                key={wp.name}
                position={{ lat: wp.lat, lng: wp.lng }}
                title={wp.name}
              >
                <div className="px-2 py-1 rounded-md bg-slate-950/80 text-slate-200 text-[10px] font-bold border border-slate-700/80 shadow-md flex items-center space-x-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      wp.type === 'border' ? 'bg-rose-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{wp.name.split(' (')[0]}</span>
                </div>
              </AdvancedMarker>
            ))}

            {/* Dynamic Fleet Truck Markers with Advanced Markers */}
            {trucks.map((truck) => {
              const lat = (truck.currentLocation as any)?.latitude ?? (truck.currentLocation as any)?._lat ?? -20;
              const lng = (truck.currentLocation as any)?.longitude ?? (truck.currentLocation as any)?._long ?? 30;
              const isJRB = truck.registration.includes('JRB');
              const hasPhoneGps = Boolean(truck.phoneGpsTelemetry?.pingedFromPhone);

              return (
                <AdvancedMarker
                  key={truck.registration}
                  position={{ lat, lng }}
                  onClick={() => {
                    setSelectedTruck(truck);
                    onSelectTruck?.(truck.registration);
                  }}
                >
                  <div className="relative flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110">
                    {/* Pulsing beacon wave */}
                    <span
                      className={`absolute inline-flex h-12 w-12 animate-ping rounded-full ${
                        hasPhoneGps
                          ? 'bg-sky-400'
                          : isJRB
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      } opacity-40`}
                    />

                    {/* Phone GPS Active Chip indicator */}
                    {hasPhoneGps && (
                      <div className="mb-0.5 px-1.5 py-0.5 rounded-full bg-sky-950/90 border border-sky-400 text-sky-300 text-[9px] font-black flex items-center space-x-1 shadow-lg">
                        <Smartphone className="w-2.5 h-2.5 text-sky-400 animate-pulse" />
                        <span>LIVE PHONE</span>
                      </div>
                    )}

                    <div
                      className={`text-slate-950 font-black px-2.5 py-1.5 rounded-xl shadow-2xl flex items-center space-x-1.5 border-2 border-white/80 ${
                        isJRB ? 'bg-amber-400 ring-2 ring-amber-500' : 'bg-emerald-400 ring-2 ring-emerald-500'
                      }`}
                    >
                      <TruckIcon className="w-3.5 h-3.5" />
                      <span className="text-xs tracking-wider">{truck.registration}</span>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for selected truck */}
            {selectedTruck && (
              <InfoWindow
                position={{
                  lat: (selectedTruck.currentLocation as any)?.latitude ?? (selectedTruck.currentLocation as any)?._lat ?? -20,
                  lng: (selectedTruck.currentLocation as any)?.longitude ?? (selectedTruck.currentLocation as any)?._long ?? 30,
                }}
                onCloseClick={() => setSelectedTruck(null)}
              >
                <div className="p-1 font-sans text-slate-900 min-w-[240px]">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                    <span className="font-black text-sm text-slate-900 tracking-wide flex items-center space-x-1">
                      <span>{selectedTruck.registration}</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        selectedTruck.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedTruck.status}
                    </span>
                  </div>

                  {/* Phone GPS live status ribbon */}
                  {selectedTruck.phoneGpsTelemetry?.pingedFromPhone ? (
                    <div className="mb-2 p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[11px] flex items-center space-x-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                      </span>
                      <Smartphone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="font-bold text-[10.5px]">Driver Phone GPS Beacon Active</span>
                    </div>
                  ) : null}

                  <div className="text-xs space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <strong className="text-slate-900">Driver:</strong>
                      <span className="font-medium text-slate-900">{selectedTruck.driver}</span>
                    </div>

                    {(selectedTruck.driverPhone || selectedTruck.phoneGpsTelemetry?.driverPhone) && (
                      <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-500 inline" />
                          <span>Driver Mobile:</span>
                        </span>
                        <span className="font-mono text-slate-900 font-bold text-[11px]">
                          {selectedTruck.driverPhone || selectedTruck.phoneGpsTelemetry?.driverPhone}
                        </span>
                      </div>
                    )}

                    {selectedTruck.phoneGpsTelemetry && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Phone GPS Speed:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {Math.round(selectedTruck.phoneGpsTelemetry.speedKmh ?? 0)} km/h
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Accuracy Radius:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            ±{Math.round(selectedTruck.phoneGpsTelemetry.accuracyMeters ?? 10)}m
                          </span>
                        </div>
                        {selectedTruck.phoneGpsTelemetry.heading !== undefined && (
                          <div className="flex justify-between text-slate-600">
                            <span>Heading:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {Math.round(selectedTruck.phoneGpsTelemetry.heading)}°
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between pt-1 border-t text-[11px]">
                      <strong className="text-slate-900">Make:</strong>
                      <span>{selectedTruck.make}</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <strong className="text-slate-900">Last GPS Ping:</strong>
                      <span className="text-slate-500 font-mono">
                        {formatDateTime(selectedTruck.lastPing)}
                      </span>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Quick GPS Waypoint Check-in Bar */}
      {canEditLocation && (
        <div className={`p-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
          isDark ? 'bg-[#0e172e] border-[#1c2c52] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center space-x-2">
            <Compass className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-slate-800'}`} />
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Quick Driver GPS Waypoint:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {quickLocations.map((loc) => (
              <button
                key={loc.label}
                onClick={() => {
                  const targetTruck = trucks[0]?.registration || 'JRB 216MP';
                  onUpdateLocation?.(targetTruck, loc.lat, loc.lng);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shadow-xs border ${
                  isDark
                    ? 'bg-[#121c38] hover:bg-[#1a284c] border-[#1d2d57] text-slate-200'
                    : 'bg-white hover:bg-slate-100 hover:border-slate-400 border-slate-200 text-slate-800'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
