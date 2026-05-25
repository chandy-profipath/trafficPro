import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text, Animated, Easing } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Hazard } from '../data';
import HazardIcon from './HazardIcon';
import { pctToLatLng, MAP_BOUNDS } from '../lib/coords';

interface Props {
  showFuel: boolean;
  showHotels: boolean;
  showMechanics: boolean;
  showHazards: boolean;
  driverPos: { x: number; y: number };
  parkedPins: { id: string; x: number; y: number }[];
  hazards: Hazard[];
  pois?: any[];
  mechanics?: any[];
  onHazardPress: (h: Hazard) => void;
  onPoiPress: (p: any) => void;
  onMechanicPress: (m: any) => void;
  onPress?: () => void;
  proximity?: 'safe' | 'warning' | 'danger';
  /** Real route coordinates from Google Directions API */
  routeCoordinates?: { latitude: number; longitude: number }[];
  /** Start and end of a real route for A/B markers */
  routeStart?: { latitude: number; longitude: number };
  routeEnd?: { latitude: number; longitude: number };
}

export default function MapCanvas(props: Props) {
  const _theme = useTheme();
  const colors = _theme.colors;
  const mode = _theme.mode;

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Use real route coordinates if available, otherwise show nothing
  const latLngPath = useMemo(() => {
    if (props.routeCoordinates && props.routeCoordinates.length > 0) {
      return props.routeCoordinates.filter(
        p => p && !isNaN(p.latitude) && !isNaN(p.longitude)
      );
    }
    return [];
  }, [props.routeCoordinates]);

  const mapRef = useRef<MapView>(null);

  // Fit the map to show the entire route when coordinates change
  useEffect(() => {
    if (latLngPath.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(latLngPath, {
        edgePadding: { top: 120, right: 60, bottom: 200, left: 60 },
        animated: true,
      });
    }
  }, [latLngPath]);

  const initialRegion = useMemo(() => {
    // If we have route coords, center on the route
    if (latLngPath.length > 0) {
      const lats = latLngPath.map(p => p.latitude);
      const lngs = latLngPath.map(p => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) * 1.4 || 0.1,
        longitudeDelta: (maxLng - minLng) * 1.4 || 0.1,
      };
    }
    return {
      latitude: ((MAP_BOUNDS?.minLat || 0) + (MAP_BOUNDS?.maxLat || 0)) / 2,
      longitude: ((MAP_BOUNDS?.minLng || 0) + (MAP_BOUNDS?.maxLng || 0)) / 2,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, []);

  const mapStyle = mode === 'dark' ? darkMapStyle : [];

  const driverPos = props.driverPos;
  const driverLL = pctToLatLng(driverPos?.x || 0, driverPos?.y || 0);
  const driverLatLng = (driverLL && !isNaN(driverLL.latitude) && !isNaN(driverLL.longitude)) 
    ? driverLL 
    : (latLngPath?.[0] || null);

  // Recenter the map on the driver when driver position updates
  useEffect(() => {
    if (driverLatLng && mapRef.current) {
      try {
        mapRef.current.animateToRegion({
          latitude: driverLatLng.latitude,
          longitude: driverLatLng.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 500);
      } catch (e) {
        // ignore animation errors
      }
    }
  }, [driverLatLng]);

  const hazardsArr = Array.isArray(props.hazards) ? props.hazards : [];
  const poisArr = Array.isArray(props.pois) ? props.pois : [];
  const mechanicsArr = Array.isArray(props.mechanics) ? props.mechanics : [];
  const parkedPinsArr = Array.isArray(props.parkedPins) ? props.parkedPins : [];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={mapStyle}
        showsPointsOfInterest={false}
        showsIndoors={false}
        showsTraffic={false}
        onPress={props.onPress}
      >
        {/* Route Path — outline shadow */}
        {latLngPath.length > 0 && (
          <Polyline
            coordinates={latLngPath}
            strokeColor={'rgba(0,0,0,0.25)'}
            strokeWidth={12}
            lineJoin="round"
            lineCap="round"
          />
        )}
        {/* Route Path — main */}
        {latLngPath.length > 0 && (
          <Polyline
            coordinates={latLngPath}
            strokeColor={colors?.primary || '#3B82F6'}
            strokeWidth={7}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Start Marker (car icon) */}
        {props.routeStart && (
          <Marker coordinate={props.routeStart} title="Start" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.abMarker, { backgroundColor: '#10B981' }]}>
              <MaterialCommunityIcons name="car" size={16} color="#fff" />
            </View>
          </Marker>
        )}
        {/* End Marker (B) */}
        {props.routeEnd && (
          <Marker coordinate={props.routeEnd} title="Destination (B)">
            <View style={[styles.abMarker, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.abMarkerText}>B</Text>
            </View>
          </Marker>
        )}

        {/* Driver Pin */}
        {driverLatLng && (
          <Marker coordinate={driverLatLng} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.driverContainer}>
               {/* Proximity Ring */}
               <Animated.View 
                style={[
                  styles.proximityRing, 
                  { 
                    borderColor: props.proximity === 'danger' ? colors.danger : 
                               props.proximity === 'warning' ? colors.warning : colors.accent,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.1] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1.2, 4.0] }) }]
                  }
                ]} 
              />
              <View style={[
                styles.driverCarWrap, 
                { 
                  backgroundColor: props.proximity === 'danger' ? colors.danger : 
                                 props.proximity === 'warning' ? colors.warning : colors.primary,
                  shadowColor: props.proximity === 'danger' ? colors.danger : colors.primary
                }
              ]}>
                <MaterialCommunityIcons name="car" size={16} color="#fff" />
              </View>
            </View>
          </Marker>
        )}

        {/* Hazards */}
        {props.showHazards && hazardsArr.map((h) => {
          if (!h) return null;
          const coord = pctToLatLng(h.x, h.y);
          return (
            <Marker key={h.id} coordinate={coord} onPress={() => props.onHazardPress(h)}>
              <HazardIcon type={h.type} severity={h.severity} withRing size={20} />
            </Marker>
          );
        })}

        {/* Fuel */}
        {props.showFuel && poisArr
          .filter(p => p && p.kind === 'fuel')
          .map(p => {
            const coord = pctToLatLng(p.x, p.y);
            // Get latest status from reports if available
            const latestStatus = p.fuel_reports?.[0]?.fuel_status;
            const statusColor = latestStatus === 'In Stock' ? '#22C55E' : 
                                latestStatus === 'Limited' ? '#FBBF24' :
                                latestStatus === 'Empty' ? '#EF4444' : '#10B981';

            return (
              <Marker key={p.id} coordinate={coord} onPress={() => props.onPoiPress(p)}>
                <View style={[styles.poiPin, { backgroundColor: statusColor }]}>
                  <MaterialCommunityIcons name="gas-station" size={16} color="#fff" />
                </View>
              </Marker>
            );
          })}

        {/* Hotels */}
        {props.showHotels && poisArr
          .filter(p => p && p.kind === 'hotel')
          .map(p => {
            const coord = pctToLatLng(p.x, p.y);
            return (
              <Marker key={p.id} coordinate={coord} onPress={() => props.onPoiPress(p)}>
                <View style={[styles.poiPin, { backgroundColor: '#6366F1' }]}>
                  <FontAwesome5 name="bed" size={12} color="#fff" />
                </View>
              </Marker>
            );
          })}

        {/* Mechanics */}
        {props.showMechanics && mechanicsArr.map(m => {
          if (!m) return null;
          const coord = pctToLatLng(m.x, m.y);
          return (
            <Marker key={m.id} coordinate={coord} onPress={() => props.onMechanicPress(m)}>
              <View style={[styles.poiPin, { backgroundColor: '#F97316' }]}>
                <MaterialCommunityIcons name="wrench" size={14} color="#fff" />
              </View>
            </Marker>
          );
        })}

        {/* Parked */}
        {parkedPinsArr.map(pp => {
          if (!pp) return null;
          const coord = pctToLatLng(pp.x, pp.y);
          return (
            <Marker key={pp.id} coordinate={coord}>
              <View style={styles.parkedPin}>
                <MaterialCommunityIcons name="parking" size={16} color="#fff" />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#020617" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0c4a6e" }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  abMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  abMarkerText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  poiPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  parkedPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#EC4899',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  driverContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    top: 0,
    left: 0,
  },
  proximityRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    top: 0,
    left: 0,
  },
  driverCarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 2,
  },
});




