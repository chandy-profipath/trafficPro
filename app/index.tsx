import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, StatusBar, Alert, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Accelerometer } from 'expo-sensors';
import { useTheme } from '../theme';
import MapCanvas from '../components/MapCanvas';
import TopBar from '../components/TopBar';
import FloatingControls from '../components/FloatingControls';
import ActionDock from '../components/ActionDock';
import AlertBanner from '../components/AlertBanner';
import ParkedBanner from '../components/ParkedBanner';
import BottomSheet from '../components/BottomSheet';
import RoutePlanner from '../components/RoutePlanner';
import ReportSheet from '../components/ReportSheet';
import MechanicsSheet from '../components/MechanicsSheet';
import ServicesSheet from '../components/ServicesSheet';
import SettingsSheet from '../components/SettingsSheet';
import ChatSheet, { ChatProvider } from '../components/ChatSheet';
import RoadCapture from '../components/RoadCapture';
import HazardDetail from '../components/HazardDetail';
import TelemetryDashboard from '../components/TelemetryDashboard';
import SparePartsSheet from '../components/SparePartsSheet';
import ShopManager from '../components/ShopManager';
import SafetyHub from '../components/SafetyHub';
import { SafetyVoice } from '../lib/SafetyVoice';
import { routePath, Hazard, HazardType } from '../data';
import { fetchRoute, RouteResult } from '../lib/directions';
import { pctToLatLng, latLngToPct } from '../lib/coords';
import {
  fetchActiveHazards,
  fetchActiveParked,
  fetchPoisWithReports,
  insertHazard,
  deleteHazard,
  registerParked,
  deregisterParked,
  subscribeHazards,
  subscribeParked,
  dbHazardToHazard,
  fetchShops,
  USER_ID,
} from '../lib/db';

type SheetKind = 'planner' | 'report' | 'mechanics' | 'services' | 'settings' | 'hazard' | 'chat' | 'spare_parts' | 'safety' | 'my_shops' | null;

export default function HomeScreen() {
  const router = useRouter();
  const _theme = useTheme();
  const colors = _theme.colors;
  const mode = _theme.mode;
  const toggle = _theme.toggle;

  const _fullscreenState = useState(false);
  const fullscreen = _fullscreenState[0];
  const setFullscreen = _fullscreenState[1];

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [user, setUser] = useState<any | null>(null);
  const [roadCaptureActive, setRoadCaptureActive] = useState(false);
  const [captureMenuVisible, setCaptureMenuVisible] = useState(false);
  const [authPortalActive, setAuthPortalActive] = useState(false);
  const [constructionPortalActive, setConstructionPortalActive] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [operatorPin, setOperatorPin] = useState('');
  const [myDeployedHazards, setMyDeployedHazards] = useState<any[]>([]);
  const [selectedManualType, setSelectedManualType] = useState<HazardType>('pothole');
  const [manualNote, setManualNote] = useState('');
  const [manualSeverity, setManualSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [chatProvider, setChatProvider] = useState<ChatProvider | null>(null);
  const [telemetryMinimized, setTelemetryMinimized] = useState(false);

  const _routeActiveState = useState(false);
  const routeActive = _routeActiveState[0];
  const setRouteActive = _routeActiveState[1];

  const _fromState = useState('Current Location');
  const from = _fromState[0];
  const setFrom = _fromState[1];

  const _toState = useState('');
  const to = _toState[0];
  const setTo = _toState[1];

  const _driverIdxState = useState(0);
  const driverIdx = _driverIdxState[0];
  const setDriverIdx = _driverIdxState[1];
  const _driverPosState = useState<{ x: number; y: number } | null>(null);
  const driverPos = _driverPosState[0];
  const setDriverPos = _driverPosState[1];

  const _parkedState = useState(false);
  const parked = _parkedState[0];
  const setParked = _parkedState[1];

  const _parkedSinceState = useState<Date | null>(null);
  const parkedSince = _parkedSinceState[0];
  const setParkedSince = _parkedSinceState[1];

  const _myParkedIdState = useState<string | null>(null);
  const myParkedId = _myParkedIdState[0];
  const setMyParkedId = _myParkedIdState[1];

  const _hazardsState = useState<Hazard[]>([]);
  const hazards = _hazardsState[0];
  const setHazards = _hazardsState[1];

  const _parkedPinsState = useState<{ id: string; x: number; y: number; user_id: string }[]>([]);
  const parkedPins = _parkedPinsState[0];
  const setParkedPins = _parkedPinsState[1];

  const _loadingState = useState(false);
  const loading = _loadingState[0];
  const setLoading = _loadingState[1];

  const _layersState = useState({ fuel: false, hotels: false, mechanics: false, hazards: true });
  const layers = _layersState[0];
  const setLayers = _layersState[1];

  const [dbPois, setDbPois] = useState<any[]>([]);
  const [dbMechanics, setDbMechanics] = useState<any[]>([]);

  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const _prevPos = useRef<{ pos: { x: number; y: number } | null; ts: number | null }>({ pos: null, ts: null });
  // Store raw GPS lat/lng for accurate speed calculation (not affected by map projection)
  const _prevGpsCoords = useRef<{ lat: number; lng: number; ts: number } | null>(null);

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // metres
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /** Real route data from Google Directions API */
  const [routeData, setRouteData] = useState<RouteResult | null>(null);

  const _activeAlertState = useState<Hazard | null>(null);
  const activeAlert = _activeAlertState[0];
  const setActiveAlert = _activeAlertState[1];

  const _dismissedState = useState<Set<string>>(new Set());
  const dismissed = _dismissedState[0];
  const setDismissed = _dismissedState[1];

  const _controlsVisibleState = useState(true);
  const controlsVisible = _controlsVisibleState[0];
  const setControlsVisible = _controlsVisibleState[1];

  const showControls = () => {
    setControlsVisible(true);
  };

  // Helper to get device position with multiple fallbacks (expo-location or navigator)
  const getDevicePosition = async () => {
    // Try expo-location first
    try {
      const mod = await import('expo-location');
      let Loc: any = mod && (mod as any).default ? (mod as any).default : mod;
      // Unwrap nested default exports
      while (Loc && typeof Loc === 'object' && Object.prototype.hasOwnProperty.call(Loc, 'default') && Object.keys(Loc).length === 1) {
        Loc = Loc.default;
      }
      try {
        console.log('[getDevicePosition] expo-location module keys:', Object.keys(Loc || {}));
      } catch (e) {
        console.log('[getDevicePosition] expo-location module shape unknown');
      }

      try {
        let perms: any = null;
        if (typeof Loc.requestForegroundPermissionsAsync === 'function') perms = await Loc.requestForegroundPermissionsAsync();
        else if (typeof Loc.requestPermissionsAsync === 'function') perms = await Loc.requestPermissionsAsync();
        else if (typeof Loc.requestPermissionAsync === 'function') perms = await Loc.requestPermissionAsync();
        if (perms && perms.status && perms.status !== 'granted') throw new Error('permission-denied');
      } catch (e) {
        // ignore permission request errors here; we'll try navigator fallback below
      }

      if (typeof Loc.getCurrentPositionAsync === 'function') {
        return await Loc.getCurrentPositionAsync({});
      }
      if (typeof Loc.getLastKnownPositionAsync === 'function') {
        const last = await Loc.getLastKnownPositionAsync({});
        if (last) return last;
      }
      if (typeof Loc.getCurrentPosition === 'function') {
        return await Loc.getCurrentPosition();
      }
      console.warn('[getDevicePosition] expo-location has no suitable position methods');
    } catch (e) {
      console.log('[getDevicePosition] expo-location import failed or unusable', e);
    }

    // Fallback to the React Native geolocation API
    return await new Promise((resolve, reject) => {
      try {
        if (typeof navigator !== 'undefined' && (navigator as any).geolocation && (navigator as any).geolocation.getCurrentPosition) {
          (navigator as any).geolocation.getCurrentPosition(
            (pos: any) => resolve(pos),
            (err: any) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          reject(new Error('no-geolocation'));
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      const data = res?.data;
      setUser(data?.user || null);
    });

    fetchActiveParked().then((rows) => {
      const validRows = Array.isArray(rows) ? rows : [];
      setParkedPins(
        validRows
          .filter((r) => r && r.x != null && r.y != null)
          .map((r) => ({ id: r.id, x: r.x as number, y: r.y as number, user_id: r.user_id }))
      );
    });
    fetchActiveHazards().then((rows) => {
      const validRows = Array.isArray(rows) ? rows : [];
      setHazards(validRows.map(dbHazardToHazard));
    });
    fetchPoisWithReports().then((rows) => {
      setDbPois(Array.isArray(rows) ? rows : []);
    });
    fetchShops().then((rows) => {
      setDbMechanics(Array.isArray(rows) ? rows : []);
    });
  }, []);

  /* ---------- Realtime subscriptions ---------- */
  useEffect(() => {
    let unsubH = () => {};
    let unsubP = () => {};
    try {
      unsubH = subscribeHazards(
        (row) => {
          setHazards((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            if (arr.find((p) => p.id === row.id)) return arr;
            return [dbHazardToHazard(row), ...arr];
          });
        },
        (deletedId) => {
          setHazards((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p.id !== deletedId));
        }
      );
      unsubP = subscribeParked(
        (row) => {
          if (!row || row.x == null || row.y == null) return;
          setParkedPins((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return [
              ...arr.filter((p) => p.id !== row.id),
              { id: row.id, x: row.x as number, y: row.y as number, user_id: row.user_id },
            ];
          });
        },
        (row) => {
          if (!row) return;
          if (!row.active) {
            setParkedPins((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p.id !== row.id));
          } else if (row.x != null && row.y != null) {
            setParkedPins((prev) => {
              const arr = Array.isArray(prev) ? prev : [];
              return [
                ...arr.filter((p) => p.id !== row.id),
                { id: row.id, x: row.x as number, y: row.y as number, user_id: row.user_id },
              ];
            });
          }
        }
      );
    } catch (e) {
      console.error('[HomeScreen] Subscription error:', e);
    }
    return () => {
      unsubH();
      unsubP();
    };
  }, []);

  /* ---------- Driver simulation ---------- */

  // Keep `driverPos` in sync: when route is active and advancing, follow routePath; otherwise use device GPS
  useEffect(() => {
    let mounted = true;
    const syncPos = async () => {
      if (routeActive && driverIdx > 0) {
        // Follow simulated route only once it has actually advanced from start
        const p = routePath[driverIdx];
        if (p && mounted) setDriverPos(p);
        return;
      }

      // Always read real device GPS on start or when not in simulation
      try {
        const pos: any = await getDevicePosition();
        const coords = pos?.coords || pos;
        const lat: number = coords.latitude;
        const lng: number = coords.longitude;
        const pct = latLngToPct(lat, lng);
        if (mounted) setDriverPos({ x: pct.x, y: pct.y });

        // --- Real GPS speed ---
        // coords.speed is in m/s (null when unavailable)
        if (coords.speed != null && coords.speed >= 0) {
          const kph = Math.round(coords.speed * 3.6);
          if (mounted) setCurrentSpeed(kph);
        } else {
          // Fallback: derive speed from raw GPS coordinate deltas
          const now = Date.now();
          const prev = _prevGpsCoords.current;
          if (prev) {
            const meters = haversineMeters(prev.lat, prev.lng, lat, lng);
            const dt = (now - prev.ts) / 1000;
            if (dt > 0 && dt < 30) {
              const rawKph = (meters / Math.max(0.001, dt)) * 3.6;
              const clamped = Math.min(Math.max(rawKph, 0), 250);
              const kph = meters < 3 ? 0 : Math.round(clamped);
              if (mounted) setCurrentSpeed(kph);
            }
          }
          _prevGpsCoords.current = { lat, lng, ts: now };
        }
      } catch (e: any) {
        console.warn('[DriverPos] Could not read device location.', e);
        if (mounted) setDriverPos(null);
        if (mounted) setCurrentSpeed(0);
        if (e && (e.message === 'permission-denied' || e.message === 'no-geolocation')) {
          Alert.alert('Location error', 'Could not read device location — please enable location permission for Expo Go.');
        } else {
          Alert.alert('Location error', 'Could not read device location. Please ensure GPS is enabled.');
        }
      }
    };

    syncPos();
    return () => { mounted = false; };
  }, [routeActive, driverIdx]);

  // Zero out speed when driverPos is cleared
  useEffect(() => {
    if (!driverPos) setCurrentSpeed(0);
    _prevPos.current = { pos: driverPos, ts: Date.now() };
  }, [driverPos]);

  /* ---------- Incident Detection (Accelerometer) ---------- */
  useEffect(() => {
    let subscription: any = null;
    let isActive = true;

    const startSensors = async () => {
      try {
        Accelerometer.setUpdateInterval(100);
        subscription = Accelerometer.addListener(({ x, y, z }: any) => {
          if (!isActive) return;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          if (magnitude > 1.8 && !roadCaptureActive) {
            setRoadCaptureActive(true);
          }
        });
      } catch (e) {
        console.warn('[Sentinel] Sensors not yet resolved. Incident detection in standby.');
      }
    };

    startSensors();
    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [roadCaptureActive]);

  /* ---------- Proximity alerts ---------- */
  useEffect(() => {
    if (!routeActive) {
      setActiveAlert(null);
      return;
    }
    const healthyHazards = Array.isArray(hazards) ? hazards : [];
    const nearby = healthyHazards
      .map((h) => {
        const dx = h.x - (driverPos?.x || 0);
        const dy = h.y - (driverPos?.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { h, dist };
      })
      .filter(({ h, dist }) => h && dist < 12 && !dismissed.has(h.id))
      .sort((a, b) => a.dist - b.dist);

    const topAlert = nearby.length > 0 ? nearby[0].h : null;
    setActiveAlert(topAlert);

    // AI Safety Voice Trigger
    if (topAlert && routeActive) {
      const nearestDist = nearby[0].dist * 40; // Convert to meters
      SafetyVoice.warnHazard(topAlert.type, topAlert.title, nearestDist);
    }
  }, [driverIdx, routeActive, dismissed, hazards]);

  const telemetry = useMemo(() => {
    if (!routeActive) return null;
    // Use measured speed if available (computed from device/simulated movement)
    const speed = currentSpeed || 0;

    // Calc next hazard distance
    const healthyHazards = Array.isArray(hazards) ? hazards : [];
    const ahead = healthyHazards
      .map(h => {
        const dx = h.x - (driverPos?.x || 0);
        const dy = h.y - (driverPos?.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { h, dist };
      })
      .filter(({h, dist}) => dist > 0 && !dismissed.has(h.id))
      .sort((a,b) => a.dist - b.dist);
      
    const nextH = ahead.length > 0 ? ahead[0] : null;

    let proximity: 'safe' | 'warning' | 'danger' = 'safe';
    if (nextH) {
      const d = nextH.dist * 40;
      if (d < 80) proximity = 'danger';
      else if (d < 150) proximity = 'warning';
    }

    return {
      speed,
      stability: 98,
      caution: 95,
      eco: 82,
      distToDest: routeData ? routeData.distanceText : `${(Math.max(0, (routePath.length - driverIdx - 1) * 0.5)).toFixed(1)} km`,
      timeToDest: routeData ? routeData.durationText : `${Math.max(1, (routePath.length - driverIdx - 1) * 2)} MIN`,
      distToDanger: nextH ? nextH.dist * 40 : null,
      dangerType: nextH ? nextH.h.type : null,
      proximity,
    };
  }, [driverIdx, routeActive, hazards, driverPos, dismissed, currentSpeed]);

  const etaText = useMemo(() => {
    if (routeData) {
      return `ETA ${routeData.durationText} · ${routeData.distanceText} remaining`;
    }
    const remaining = routePath.length - driverIdx - 1;
    const mins = Math.max(1, remaining * 2);
    return `ETA ${mins} min · ${(remaining * 0.5).toFixed(1)} km remaining`;
  }, [driverIdx, routeData]);

  /* ---------- Route Preview ---------- */
  useEffect(() => {
    if (sheet === 'planner' && from && to && !routeActive) {
      const timer = setTimeout(() => {
        handlePreviewRoute(from, to);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sheet, from, to, routeActive]);

  const handlePreviewRoute = async (f: string, t: string) => {
    setLoading(true);
    try {
      let originQuery = f;
      if (f === 'Current Location') {
        // Must use device GPS for Current Location
        try {
          const pos: any = await getDevicePosition();
          const coords = pos?.coords || pos;
          if (coords && coords.latitude && coords.longitude) {
            originQuery = `${coords.latitude},${coords.longitude}`;
          } else {
            throw new Error('no-device-coords');
          }
        } catch (e: any) {
          console.warn('[Route Preview] Location fetch failed.', e);
          Alert.alert('Location required', 'Current Location requires device GPS. Please enable location and try again.');
          setRouteData(null);
          return;
        }
      }
      const result = await fetchRoute(originQuery, t);
      setRouteData(result);
    } catch (e: any) {
      console.log('[Route Preview] Failed:', e);
      // We don't alert here so we don't spam the user while they are typing
      setRouteData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Route actions ---------- */
  const handleStartRoute = async (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    setLoading(true);

    try {
      if (!routeData) {
        let originQuery = f;
        // If using current location, require device GPS
        if (f === 'Current Location') {
          try {
            const pos: any = await getDevicePosition();
            const coords = pos?.coords || pos;
            if (coords && coords.latitude && coords.longitude) {
              originQuery = `${coords.latitude},${coords.longitude}`;
            } else {
              throw new Error('no-device-coords');
            }
          } catch (e: any) {
            console.warn('[Route] Location fetch failed.', e);
            Alert.alert('Location required', 'Current Location requires device GPS. Please enable location and try again.');
            setLoading(false);
            return;
          }
        }
        // Fetch real route from Google Directions API
        const result = await fetchRoute(originQuery, t);
        setRouteData(result);
        console.log('[Route] Fetched real route:', result.distanceText, result.durationText, `(${result.coordinates.length} points)`);
      }

      // Also fetch hazards along the route
      const rows = await fetchActiveHazards();
      setHazards((Array.isArray(rows) ? rows : []).map(dbHazardToHazard));

      setRouteActive(true);
      setDriverIdx(0);
      setDismissed(new Set());
      setSheet(null);
    } catch (e: any) {
      console.error('[Route] Failed:', e);
      Alert.alert('Route Error', e?.message || 'Could not find a route between these locations');
    } finally {
      setLoading(false);
    }
  };

  const handleStopRoute = () => {
    setRouteActive(false);
    setRouteData(null);
    setSheet(null);
  };

  /* ---------- Park ---------- */
  const handleTogglePark = async () => {
    if (parked) {
      try {
        await deregisterParked();
      } catch (e) {}
      setParked(false);
      setParkedSince(null);
      if (myParkedId) {
        setParkedPins((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p.id !== myParkedId));
        setMyParkedId(null);
      }
    } else {
      try {
        // Require real device GPS when parking
        let parkX: number | undefined;
        let parkY: number | undefined;
        try {
          const pos: any = await getDevicePosition();
          const coords = pos?.coords || pos;
          if (coords && coords.latitude && coords.longitude) {
            const pct = latLngToPct(coords.latitude, coords.longitude);
            parkX = pct.x;
            parkY = pct.y;
          } else {
            throw new Error('no-device-coords');
          }
        } catch (e: any) {
          console.warn('[Park] getDevicePosition failed', e);
          Alert.alert('Location required', 'Parking requires device GPS. Please enable location and try again.');
          return;
        }
        const row = await registerParked(parkX, parkY);
        setParked(true);
        setParkedSince(new Date());
        setMyParkedId(row.id);
        setParkedPins((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return [
            ...arr.filter((p) => p.user_id !== USER_ID),
            { id: row.id, x: row.x as number, y: row.y as number, user_id: row.user_id },
          ];
        });
      } catch (e: any) {
        Alert.alert('Could not register parking', e?.message || 'Unknown error');
      }
    }
  };

  /* ---------- Auto-deregister when driver moves ---------- */
  useEffect(() => {
    if (!parked || !parkedSince || !myParkedId) return;
    const arr = Array.isArray(parkedPins) ? parkedPins : [];
    const myPin = arr.find((p) => p.id === myParkedId);
    if (!myPin) return;
    const dx = myPin.x - (driverPos?.x || 0);
    const dy = myPin.y - (driverPos?.y || 0);
    const moved = Math.sqrt(dx * dx + dy * dy);
    if (moved > 6) {
      deregisterParked().catch(() => {});
      setParked(false);
      setParkedSince(null);
      setParkedPins((prev) => (Array.isArray(prev) ? prev : []).filter((p) => p.id !== myParkedId));
      setMyParkedId(null);
    }
  }, [driverPos, parked, parkedSince, parkedPins, myParkedId]);

  /* ---------- Report hazard ---------- */
  const handleReportSubmit = async (
    type: HazardType,
    note: string,
    severity: 'low' | 'medium' | 'high'
  ) => {
    setSheet(null);
    if (!driverPos) {
      Alert.alert('Location error', 'Driver location is not available. Please try again.');
      return;
    }
    try {
      await insertHazard({
        type,
        severity,
        title: note || 'Road hazard reported',
        note,
        x: driverPos.x,
        y: driverPos.y,
      });
      Alert.alert(
        'Hazard reported',
        'Your report was uploaded to the cloud. Nearby drivers will be warned in real time.'
      );
    } catch (e: any) {
      Alert.alert('Report failed', e?.message || 'Please try again');
    }
  };

  const openHazard = (h: Hazard) => {
    setSelectedHazard(h);
    setSheet('hazard');
  };

  const parkedSinceText = useMemo(() => {
    if (!parkedSince) return '';
    const diff = Math.floor((Date.now() - parkedSince.getTime()) / 60000);
    return diff === 0 ? 'just now' : `${diff}m ago`;
  }, [parkedSince]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={StyleSheet.absoluteFill}>
        <MapCanvas
          showFuel={layers.fuel}
          showHotels={layers.hotels}
          showMechanics={layers.mechanics}
          showHazards={layers.hazards && routeActive}
          driverPos={driverPos || { x: 50, y: 50 }}
          parkedPins={Array.isArray(parkedPins) ? parkedPins : []}
          hazards={Array.isArray(hazards) ? hazards : []}
          pois={dbPois}
          mechanics={dbMechanics}
          onHazardPress={openHazard}
          onPoiPress={() => setSheet('services')}
          onMechanicPress={() => setSheet('mechanics')}
          onPress={showControls}
          proximity={telemetry?.proximity || 'safe'}
          routeCoordinates={routeData?.coordinates}
          routeStart={routeData?.startLocation}
          routeEnd={routeData?.endLocation}
        />
      </View>

      <FloatingControls
        fullscreen={fullscreen}
        onToggleFullscreen={() => { showControls(); setFullscreen((f) => !f); }}
        onToggleTheme={toggle}
        onCenter={showControls}
        layers={layers}
        setLayers={(l) => { showControls(); setLayers(l); }}
        visible={controlsVisible}
      />

      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        {!fullscreen && (
          <TopBar
            routeActive={routeActive}
            destination={to}
            setDestination={setTo}
            onSelectSuggestion={(desc) => {
              setTo(desc);
              setSheet('planner');
            }}
            etaText={loading ? 'Downloading hazards...' : etaText}
            onOpenSettings={() => setSheet('settings')}
          />
        )}

        {Array.isArray(hazards) && !fullscreen && activeAlert && (
          <AlertBanner
            hazard={activeAlert}
            distanceAway={Math.round(
              Math.sqrt(
                Math.pow(((activeAlert as any).x || 0) - (driverPos?.x || 0), 2) +
                  Math.pow(((activeAlert as any).y || 0) - (driverPos?.y || 0), 2)
              ) * 40
            )}
            onDismiss={() => setDismissed((prev) => {
              const s = (prev instanceof Set) ? prev : new Set<string>();
              const next = new Set<string>(s);
              next.add(activeAlert.id);
              return next;
            })}
          />
        )}

        {!fullscreen && parked && (
          <ParkedBanner onClear={handleTogglePark} since={parkedSinceText} />
        )}

        <View style={{ flex: 1 }} pointerEvents="box-none" />
      </SafeAreaView>

      {!fullscreen && (
        <ActionDock
          parked={parked}
          onTogglePark={() => { showControls(); handleTogglePark(); }}
          onOpenCapture={() => setCaptureMenuVisible(true)}
          onOpenSafety={() => setSheet('safety')}
          onOpenShop={() => setSheet('spare_parts')}
          onOpenProfile={() => {
            const xVal = driverPos ? driverPos.x : 50;
            const yVal = driverPos ? driverPos.y : 50;
            router.push({ pathname: '/profile', params: { x: xVal.toString(), y: yVal.toString() } });
          }}
          visible={controlsVisible}
          telemetryMinimized={telemetryMinimized}
        />
      )}


      <TelemetryDashboard 
        speed={telemetry?.speed || 0}
        stability={telemetry?.stability || 0}
        caution={telemetry?.caution || 0}
        eco={telemetry?.eco || 0}
        distToDest={telemetry?.distToDest || '0.0 km'}
        timeToDest={telemetry?.timeToDest || (routeActive ? '—' : '0 MIN')}
        distToDanger={telemetry?.distToDanger ?? null}
        dangerType={telemetry?.dangerType ?? null}
        visible={!fullscreen && controlsVisible}
        minimized={telemetryMinimized}
        onToggleMinimize={() => setTelemetryMinimized(!telemetryMinimized)}
      />

      

      {!fullscreen && controlsVisible && (
        <View style={styles.mapStatus}>
          <View style={styles.statusRow}>
             <View style={styles.statusDot} />
             <Text style={styles.statusText}>GPS LINKED · HYBRID 4.0</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statusRow}>
             <MaterialCommunityIcons name="shield-check" size={10} color={colors.primary} />
             <Text style={styles.statusText}>SCORE: 98.4</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statusRow}>
             <Text style={[styles.statusText, { color: '#F59E0B' }]}>850 pts</Text>
          </View>
        </View>
      )}


      <BottomSheet
        visible={sheet === 'planner'}
        onClose={() => setSheet(null)}
        title="Directions"
        heightPct={50}
      >
        <RoutePlanner
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onStart={handleStartRoute}
          routeActive={routeActive}
          onStop={handleStopRoute}
          routeData={routeData}
          loading={loading}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'report'}
        onClose={() => setSheet(null)}
        title="Report a road hazard"
        subtitle="Help fellow drivers stay safe"
        heightPct={80}
      >
        <ReportSheet onSubmit={handleReportSubmit} />
      </BottomSheet>

      {sheet === 'mechanics' && (
        <BottomSheet
          visible={true}
          onClose={() => setSheet(null)}
          title="Find a mechanic"
          subtitle="Trusted shops near your location"
          heightPct={85}
        >
        <MechanicsSheet 
          onSelect={(m) => {
            setSheet(null);
            handleStartRoute('Current Location', m.name);
          }}
          onChat={(m) => {
            setChatProvider({ id: m.id, name: m.name, type: 'mechanic' });
            setSheet('chat');
          }}
        />
        </BottomSheet>
      )}

      <BottomSheet
        visible={sheet === 'services'}
        onClose={() => setSheet(null)}
        title="Services along your route"
        subtitle="Fuel stations, hotels & lodges"
        heightPct={80}
      >
        <ServicesSheet 
          onOpenShop={() => setSheet('spare_parts')} 
          pois={dbPois}
          onSelectPOI={(poi) => {
            setSheet(null);
            handleStartRoute('Current Location', poi.name);
          }}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'spare_parts'}
        onClose={() => setSheet(null)}
        title="Spare Parts Marketplace"
        subtitle="Genuine vehicle components"
        heightPct={85}
        scrollEnabled={false}
      >
        <SparePartsSheet 
          onChat={(shop) => {
            setChatProvider({ id: shop.id, name: shop.name, type: shop.type === 'Supplier' ? 'supplier' : 'mechanic' });
            setSheet('chat');
          }}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'my_shops'}
        onClose={() => setSheet(null)}
        title="My Shops"
        subtitle="Manage your shops and products"
        heightPct={85}
      >
        <ShopManager 
          user={user} 
          userX={driverPos ? driverPos.x : 50} 
          userY={driverPos ? driverPos.y : 50} 
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'safety'}
        onClose={() => setSheet(null)}
        title="Safety Hub"
        subtitle="Your rewards and driving insights"
        heightPct={85}
      >
        <SafetyHub />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'settings'}
        onClose={() => setSheet(null)}
        title="Settings"
        subtitle="Customize your driving experience"
        heightPct={80}
      >
        <SettingsSheet onOpenMyShops={() => setSheet('my_shops')} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'chat'}
        onClose={() => setSheet(null)}
        title="Chat with Services"
        subtitle="Connect with mechanics & suppliers"
        heightPct={80}
      >
        <ChatSheet initialProvider={chatProvider} />
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'hazard' && !!selectedHazard}
        onClose={() => setSheet(null)}
        title="Hazard details"
        heightPct={65}
      >
        {selectedHazard && <HazardDetail hazard={selectedHazard} />}
      </BottomSheet>

      {/* 1. Diagnostic Optical Scan Selector Menu */}
      <BottomSheet
        visible={captureMenuVisible}
        onClose={() => setCaptureMenuVisible(false)}
        title="Diagnostic Optical Scan"
        heightPct={45}
      >
        <View style={{ gap: 14, padding: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
            Select your Sentinel scan method to monitor or deploy road status.
          </Text>
          
          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 16, 
              borderRadius: 16, 
              backgroundColor: colors.surfaceElevated, 
              borderWidth: 1.5, 
              borderColor: colors.border 
            }}
            onPress={() => {
              setCaptureMenuVisible(false);
              setRoadCaptureActive(true);
            }}
            activeOpacity={0.8}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="video-wireless-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Sentinel Camera Scanning</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Activates real-time AI optical scanning & accelerometer sensors.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 16, 
              borderRadius: 16, 
              backgroundColor: colors.surfaceElevated, 
              borderWidth: 1.5, 
              borderColor: colors.border 
            }}
            onPress={() => {
              setCaptureMenuVisible(false);
              setAuthPortalActive(true);
            }}
            activeOpacity={0.8}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="hammer-wrench" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Manual Construction Portal</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>For certified construction users to manually deploy and dismantle hazards.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* 2. Construction Authority Secure Gateway */}
      <BottomSheet
        visible={authPortalActive}
        onClose={() => {
          setAuthPortalActive(false);
          setOperatorId('');
          setOperatorPin('');
        }}
        title="Construction Authority Gateway"
        heightPct={55}
      >
        <View style={{ padding: 4 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>Authorized Personnel Only</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
            Please input your Operator ID and secure PIN to manage active corridor hazards. (Hint: ID 777, PIN 2026)
          </Text>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' }}>Operator ID Number</Text>
              <TextInput
                placeholder="Enter Operator ID"
                placeholderTextColor={colors.textMuted}
                value={operatorId}
                onChangeText={setOperatorId}
                keyboardType="numeric"
                style={{ 
                  height: 48, 
                  borderWidth: 1.5, 
                  borderColor: colors.border, 
                  borderRadius: 12, 
                  paddingHorizontal: 14, 
                  color: colors.text, 
                  backgroundColor: colors.surfaceElevated,
                  fontWeight: '600'
                }}
              />
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' }}>Authorization PIN</Text>
              <TextInput
                placeholder="Enter 4-Digit PIN"
                placeholderTextColor={colors.textMuted}
                value={operatorPin}
                onChangeText={setOperatorPin}
                keyboardType="numeric"
                secureTextEntry
                style={{ 
                  height: 48, 
                  borderWidth: 1.5, 
                  borderColor: colors.border, 
                  borderRadius: 12, 
                  paddingHorizontal: 14, 
                  color: colors.text, 
                  backgroundColor: colors.surfaceElevated,
                  fontWeight: '600'
                }}
              />
            </View>

            <TouchableOpacity
              style={{ 
                height: 48, 
                borderRadius: 12, 
                backgroundColor: colors.primary, 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginTop: 10,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4
              }}
              onPress={() => {
                if (operatorId === '777' && operatorPin === '2026') {
                  setAuthPortalActive(false);
                  setOperatorId('');
                  setOperatorPin('');
                  setConstructionPortalActive(true);
                } else {
                  Alert.alert('Access Denied', 'Invalid credentials. Hint: Operator ID 777, Secure PIN 2026.');
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Unlock Console</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {/* 3. Construction Operator Deployment Hub */}
      <BottomSheet
        visible={constructionPortalActive}
        onClose={() => setConstructionPortalActive(false)}
        title="Construction Operator Hub"
        heightPct={85}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <View style={{ padding: 4 }}>
            {/* GPS coordinates lock header */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 12, 
              borderRadius: 12, 
              backgroundColor: colors.success + '12', 
              borderColor: colors.success, 
              borderWidth: 1,
              marginBottom: 16,
              gap: 10
            }}>
              <Ionicons name="location" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.success, fontWeight: '800', fontSize: 13 }}>GPS Core Coordinates Locked</Text>
                <Text style={{ color: colors.text, fontSize: 11.5, fontWeight: '600', marginTop: 2 }}>
                  X: {driverPos ? driverPos.x.toFixed(2) : '50.0'} · Y: {driverPos ? driverPos.y.toFixed(2) : '50.0'}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.success }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>LINKED</Text>
              </View>
            </View>

            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>1. Deploy New Hazard</Text>
            
            {/* Form Fields */}
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>SELECT HAZARD CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['pothole', 'debris', 'speed_bump', 'sharp_curve', 'parked_vehicle'] as HazardType[]).map((type) => {
                    const isSelected = selectedManualType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setSelectedManualType(type)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '12' : colors.surfaceElevated,
                        }}
                      >
                        <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 11.5, fontWeight: '800', textTransform: 'capitalize' }}>
                          {type.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>HAZARD LABEL / TITLE</Text>
                <TextInput
                  placeholder="e.g. Active Excavator Crossing"
                  placeholderTextColor={colors.textMuted}
                  value={manualNote}
                  onChangeText={setManualNote}
                  style={{
                    height: 44,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    color: colors.text,
                    backgroundColor: colors.surfaceElevated,
                    fontWeight: '600'
                  }}
                />
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>SEVERITY LEVEL</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['low', 'medium', 'high'] as const).map((sev) => {
                    const isSelected = manualSeverity === sev;
                    const sevColors = {
                      low: colors.primary,
                      medium: colors.accent,
                      high: colors.danger,
                    };
                    const activeColor = sevColors[sev];
                    return (
                      <TouchableOpacity
                        key={sev}
                        onPress={() => setManualSeverity(sev)}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isSelected ? activeColor : colors.border,
                          backgroundColor: isSelected ? activeColor + '12' : colors.surfaceElevated,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: isSelected ? activeColor : colors.text, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                          {sev}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={{
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 8
                }}
                onPress={async () => {
                  if (!manualNote.trim()) {
                    Alert.alert('Input required', 'Please enter a description for the manual road hazard.');
                    return;
                  }
                  const targetX = driverPos ? driverPos.x : 50;
                  const targetY = driverPos ? driverPos.y : 50;

                  try {
                    const result = await insertHazard({
                      type: selectedManualType,
                      severity: manualSeverity,
                      title: '🚧 ' + manualNote.trim(),
                      note: 'Construction deployment: ' + manualNote.trim(),
                      x: targetX,
                      y: targetY,
                    });

                    // Add to active deployed hazards state
                    setMyDeployedHazards(prev => [result, ...prev]);
                    setManualNote('');
                    
                    // Trigger map reload in index.tsx
                    const updated = await fetchActiveHazards();
                    if (Array.isArray(updated)) {
                      setHazards(updated.map(dbHazardToHazard));
                    }

                    Alert.alert('Deployed successfully', 'Manual hazard deployed at your exact location!');
                  } catch (e: any) {
                    Alert.alert('Deployment Failed', e.message);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>⚠️ DEPLOY HAZARD TO GPS</Text>
              </TouchableOpacity>
            </View>

            {/* Active Deployed list */}
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>2. Your Active Deployments ({myDeployedHazards.length})</Text>

            <View style={{ gap: 10 }}>
              {myDeployedHazards.length === 0 ? (
                <View style={{ 
                  padding: 16, 
                  borderRadius: 12, 
                  borderWidth: 1.5, 
                  borderColor: colors.border, 
                  borderStyle: 'dashed',
                  alignItems: 'center' 
                }}>
                  <MaterialCommunityIcons name="road-variant" size={24} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 4, textAlign: 'center' }}>No active hazards deployed in this session.</Text>
                </View>
              ) : (
                myDeployedHazards.map((item) => (
                  <View 
                    key={item.id} 
                    style={{ 
                      padding: 12, 
                      borderRadius: 14, 
                      borderWidth: 1, 
                      borderColor: colors.border, 
                      backgroundColor: colors.surfaceElevated 
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{item.title}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10.5, marginTop: 2 }}>
                          Type: {item.type} · Severity: {item.severity}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.danger + '15',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderColor: colors.danger,
                          borderWidth: 1
                        }}
                        onPress={async () => {
                          Alert.alert(
                            'Dismantle Hazard',
                            'Are you sure you want to delete this hazard from the corridor registry?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Delete Now', 
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await deleteHazard(item.id);
                                    setMyDeployedHazards(prev => prev.filter(h => h.id !== item.id));
                                    
                                    // Trigger map reload
                                    const updated = await fetchActiveHazards();
                                    if (Array.isArray(updated)) {
                                      setHazards(updated.map(dbHazardToHazard));
                                    }
                                    Alert.alert('Dismantled', 'Hazard successfully deleted.');
                                  } catch (e: any) {
                                    Alert.alert('Deletion Failed', e.message);
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 10 }}>DELETE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </BottomSheet>

      {roadCaptureActive && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <RoadCapture onClose={() => setRoadCaptureActive(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  mapStatus: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  debugBtn: {
    position: 'absolute',
    right: 8,
    bottom: 120,
    zIndex: 9999,
  },
  debugBtnInner: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    elevation: 6,
  },
});
