import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../theme';
import { pois, mechanics, routePath, Hazard, POI, Mechanic } from '../data';
import { pctToLatLng, MAP_BOUNDS } from '../lib/coords';

// Fix for Leaflet default icon issues in bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  showFuel: boolean;
  showHotels: boolean;
  showMechanics: boolean;
  showHazards: boolean;
  driverPos: { x: number; y: number };
  parkedPins: { id: string; x: number; y: number }[];
  hazards: Hazard[];
  onHazardPress: (h: Hazard) => void;
  onPoiPress: (p: POI) => void;
  onMechanicPress: (m: Mechanic) => void;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapCanvasWeb({
  showFuel,
  showHotels,
  showMechanics,
  showHazards,
  driverPos,
  parkedPins,
  hazards,
  onHazardPress,
  onPoiPress,
  onMechanicPress,
}: Props) {
  const { colors, mode } = useTheme();

  const center: [number, number] = [
    (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2,
    (MAP_BOUNDS.minLng + MAP_BOUNDS.maxLng) / 2,
  ];

  const latLngPath = useMemo(() => 
    routePath.map(p => {
      const ll = pctToLatLng(p.x, p.y);
      return [ll.latitude, ll.longitude] as [number, number];
    }), []);

  const driverLL = pctToLatLng(driverPos.x, driverPos.y);
  const driverPosCenter: [number, number] = [driverLL.latitude, driverLL.longitude];

  // Tile layer URL based on mode
  const tileUrl = mode === 'dark' 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = mode === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <View style={styles.container}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <MapController center={driverPosCenter} />

        {/* Route Path */}
        <Polyline
          positions={latLngPath}
          pathOptions={{ color: colors.primary, weight: 6, opacity: 0.8 }}
        />

        {/* Start / End Markers */}
        <Marker position={latLngPath[0]} eventHandlers={{ click: () => {} }}>
           {/* Custom icons would go here, using default for now */}
        </Marker>
        <Marker position={latLngPath[latLngPath.length - 1]} />

        {/* Driver Marker */}
        <Marker 
          position={driverPosCenter}
          icon={L.divIcon({
            className: 'driver-marker',
            html: `<div style="background-color: ${colors.primary}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })}
        />

        {/* Hazards */}
        {showHazards && hazards.map(h => {
          const ll = pctToLatLng(h.x, h.y);
          return (
            <Marker 
              key={h.id} 
              position={[ll.latitude, ll.longitude]}
              eventHandlers={{ click: () => onHazardPress(h) }}
              icon={L.divIcon({
                className: 'hazard-marker',
                html: `<div style="background-color: ${h.severity === 'high' ? '#EF4444' : '#F59E0B'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
          );
        })}

        {/* Fuel Stations */}
        {showFuel && pois.filter(p => p.kind === 'fuel').map(p => {
          const ll = pctToLatLng(p.x, p.y);
          return (
            <Marker 
              key={p.id} 
              position={[ll.latitude, ll.longitude]}
              eventHandlers={{ click: () => onPoiPress(p) }}
              icon={L.divIcon({
                className: 'poi-marker',
                html: `<div style="background-color: #22C55E; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })}
            />
          );
        })}
        
        {/* Hotels */}
        {showHotels && pois.filter(p => p.kind === 'hotel').map(p => {
          const ll = pctToLatLng(p.x, p.y);
          return (
            <Marker 
              key={p.id} 
              position={[ll.latitude, ll.longitude]}
              eventHandlers={{ click: () => onPoiPress(p) }}
              icon={L.divIcon({
                className: 'poi-marker',
                html: `<div style="background-color: #6366F1; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })}
            />
          );
        })}

        {/* Mechanics */}
        {showMechanics && mechanics.map(m => {
          const ll = pctToLatLng(m.x, m.y);
          return (
            <Marker 
              key={m.id} 
              position={[ll.latitude, ll.longitude]}
              eventHandlers={{ click: () => onMechanicPress(m) }}
              icon={L.divIcon({
                className: 'mechanic-marker',
                html: `<div style="background-color: #F97316; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })}
            />
          );
        })}

        {/* Parked Pins */}
        {parkedPins.map(pp => {
          const ll = pctToLatLng(pp.x, pp.y);
          return (
            <Marker 
              key={pp.id} 
              position={[ll.latitude, ll.longitude]}
              icon={L.divIcon({
                className: 'parked-marker',
                html: `<div style="background-color: #EC4899; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
          );
        })}

      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
