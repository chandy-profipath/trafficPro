import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Accelerometer } from 'expo-sensors';

interface Props {
  onClose: () => void;
}

export default function RoadCapture({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Dual-mode state: PIP (minimised) vs fullscreen (maximised)
  const [isMinimised, setIsMinimised] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [logs, setLogs] = useState<string[]>(['[SENTINEL] Neural engine engaged', '[SENTINEL] LIDAR/Optical Fusion Active']);
  const [incident, setIncident] = useState(false);

  // Accelerometer states
  const [xVal, setXVal] = useState(0);
  const [yVal, setYVal] = useState(0);
  const [zVal, setZVal] = useState(1);
  const [accelHistory, setAccelHistory] = useState<{x: number, y: number, z: number, mag: number}[]>([]);

  useEffect(() => {
     const interval = setInterval(() => {
        const mockEvents = [
          '[SCAN] Surface: Smooth Asphalt',
          '[SCAN] Lane bounds locked',
          '[AI] Road health: 98%',
          '[SCAN] Analyzing surface texture...',
          '[AI] Livestock detected 50m ahead (caution)',
          '[SCAN] Visibility: Good (800m)',
          '[AI] Processing frame latency: 8ms',
          '[SCAN] Shoulder status: Stable',
        ];
        const event = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        setLogs(prev => [event, ...prev.slice(0, 12)]);
     }, 2000);
     return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Real-time Accelerometer Listener
  useEffect(() => {
    let subscription: any = null;
    let active = true;
    try {
      Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(({ x, y, z }: any) => {
        if (!active) return;
        setXVal(x);
        setYVal(y);
        setZVal(z);
        const mag = Math.sqrt(x*x + y*y + z*z);
        setAccelHistory(prev => [{ x, y, z, mag }, ...prev].slice(0, 40));
        
        // Incident threshold check in road capture
        if (mag > 1.8) {
          setIncident(true);
        }
      });
    } catch (e) {
      // Standby fallback simulation (for simulator or browser views)
      const mockInterval = setInterval(() => {
        if (!active) return;
        const x = (Math.random() - 0.5) * 0.3;
        const y = (Math.random() - 0.5) * 0.3;
        const z = 1.0 + (Math.random() - 0.5) * 0.3;
        const mag = Math.sqrt(x*x + y*y + z*z);
        setXVal(x);
        setYVal(y);
        setZVal(z);
        setAccelHistory(prev => [{ x, y, z, mag }, ...prev].slice(0, 40));
        
        if (mag > 1.7) {
          setIncident(true);
        }
      }, 100);
      
      return () => {
        active = false;
        clearInterval(mockInterval);
      };
    }

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={{ textAlign: 'center', color: colors.text }}>Road Sentinel requires optical access</Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.permissionBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Authorize AI</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Current G-Force Magnitude
  const currentG = Math.sqrt(xVal*xVal + yVal*yVal + zVal*zVal);

  /* ============================================================================
     PICTURE-IN-PICTURE (MINIMISED) VIEWPORT
     ============================================================================ */
  if (isMinimised) {
    return (
      <View style={[styles.pipContainer, { borderColor: colors.border }]}>
        <CameraView style={styles.camera} facing="back">
          <View style={styles.pipOverlay}>
            {/* PIP Small Header Toolbar */}
            <View style={styles.pipHeader}>
              <TouchableOpacity onPress={() => setIsMinimised(false)} style={styles.pipBtn} activeOpacity={0.7}>
                <Ionicons name="expand" size={13} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.pipBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={13} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* PIP Accel diagnostic view overlayed */}
            <View style={styles.pipFooter}>
              <Text style={styles.pipTelemetryText}>{currentG.toFixed(2)} G</Text>
              
              {/* Vertical Accelerometer Bar wave representation */}
              <View style={styles.miniGraphContainer}>
                {accelHistory.slice(0, 15).reverse().map((h, idx) => {
                  const valHeight = Math.min(Math.max((h.mag - 0.75) * 20, 2), 20);
                  let barColor = '#3B82F6';
                  if (h.mag > 1.4) barColor = '#EF4444';
                  else if (h.mag > 1.1) barColor = '#F59E0B';

                  return (
                    <View 
                      key={idx} 
                      style={{
                        width: 2,
                        height: valHeight,
                        backgroundColor: barColor,
                        borderRadius: 1,
                        marginHorizontal: 0.5,
                      }} 
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  /* ============================================================================
     FULLSCREEN (MAXIMISED) DETAILED GRAPH VIEWPORT
     ============================================================================ */
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        <View style={[styles.overlay, { paddingTop: insets.top + 20 }]}>
          {/* Top HUD Row */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsMinimised(true)} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="contract" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.statusColumn, { alignItems: 'center' }]}>
               <View style={[styles.badge, incident && { backgroundColor: '#EF4444' }]}>
                 <MaterialCommunityIcons name={incident ? 'alert' : 'shield-airplane'} size={14} color="#fff" style={{ marginRight: 4 }} />
                 <Text style={styles.badgeText}>{incident ? 'INCIDENT DETECTED' : 'SENTINEL ACTIVE'}</Text>
               </View>
               <Text style={styles.telemetryText}>
                 {currentG.toFixed(2)} G · PITCH: {(yVal * 90).toFixed(1)}° · ROLL: {(xVal * 90).toFixed(1)}°
               </Text>
            </View>

            <TouchableOpacity style={styles.badge} onPress={() => setIncident(prev => !prev)}>
              <Text style={[styles.badgeText, { color: incident ? '#EF4444' : '#fff' }]}>
                {incident ? 'RESET' : 'TEST'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Device Accelerometer Interactive Graph Panel */}
          <View style={[styles.telemetryGraphPanel, { backgroundColor: 'rgba(15, 23, 42, 0.75)', borderColor: 'rgba(255, 255, 255, 0.15)' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="pulse" size={16} color="#3B82F6" />
                <Text style={styles.graphPanelTitle}>ACCELEROMETER SPECTRUM</Text>
              </View>
              <Text style={styles.gForceText}>{currentG.toFixed(3)} G</Text>
            </View>

            {/* Row of dynamic vector bars */}
            <View style={styles.graphBarsRow}>
              {accelHistory.slice(0, 30).reverse().map((h, i) => {
                const barHeight = Math.min(Math.max((h.mag - 0.7) * 45, 2), 48);
                let color = '#3B82F6';
                if (h.mag > 1.4) color = '#EF4444';
                else if (h.mag > 1.1) color = '#F59E0B';
                
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 48 }}>
                    <View 
                      style={{
                        width: 4,
                        height: barHeight,
                        backgroundColor: color,
                        borderRadius: 2,
                      }} 
                    />
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 4 }}>
              <Text style={styles.graphAxesText}>X (Lat): {xVal.toFixed(2)} g</Text>
              <Text style={styles.graphAxesText}>Y (Long): {yVal.toFixed(2)} g</Text>
              <Text style={styles.graphAxesText}>Z (Vert): {zVal.toFixed(2)} g</Text>
            </View>
          </View>

          {/* Neural Target Mapping overlay */}
          <View style={styles.scanTarget}>
            <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }]} />
            <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }]} />
            <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
            <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }]} />

            <Animated.View 
              style={[
                styles.scanLine,
                {
                  transform: [{
                    translateY: scanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 160]
                    })
                  }]
                }
              ]} 
            />
            
            {/* Target recognition blocks */}
            <View style={[styles.detectionBox, { top: 30, left: 20, width: 90, height: 45, borderColor: '#3B82F6' }]}>
               <Text style={styles.detectionLabel}>SURFACE TEXTURE</Text>
            </View>
            <View style={[styles.detectionBox, { bottom: 30, right: 30, width: 100, height: 50, borderColor: '#EF4444' }]}>
               <Text style={styles.detectionLabel}>POTHOLE DANGER</Text>
            </View>
          </View>

          {/* Diagnostic Log overlay and controls */}
          <View style={styles.neuralFeed}>
             <View style={styles.logContainer}>
                {logs.map((log, i) => (
                   <Text key={i} style={[styles.logLine, { opacity: 1 - (i * 0.12) }]}>{log}</Text>
                ))}
             </View>
             
             {/* Symmetrical direct report button */}
             <View style={styles.captureWrap}>
                <TouchableOpacity style={styles.captureBtn} onPress={onClose} activeOpacity={0.8}>
                   <View style={styles.captureInner}>
                      <MaterialCommunityIcons name="shield-check" size={28} color="#fff" />
                   </View>
                </TouchableOpacity>
                <Text style={styles.instruction}>REPORT HAZARD</Text>
             </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center',
  },
  camera: { 
    flex: 1,
  },
  pipContainer: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    width: 140,
    height: 196,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  pipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'space-between',
    padding: 8,
  },
  pipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipFooter: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: 10,
    padding: 6,
  },
  pipTelemetryText: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  miniGraphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between',
  },
  headerLeftRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusColumn: { 
    flex: 1, 
    gap: 4,
  },
  telemetryText: { 
    color: 'rgba(255,255,255,0.85)', 
    fontSize: 9.5, 
    fontWeight: '900', 
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  backBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: 'rgba(15, 23, 42, 0.68)', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 0.5,
  },
  telemetryGraphPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  graphPanelTitle: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gForceText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
  },
  graphBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
    gap: 2,
    marginTop: 6,
  },
  graphAxesText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
  },
  scanTarget: {
    alignSelf: 'center',
    width: Dimensions.get('window').width * 0.75,
    height: 160,
    position: 'relative',
    marginVertical: 10,
  },
  corner: { 
    position: 'absolute', 
    width: 16, 
    height: 16, 
    borderColor: 'rgba(255,255,255,0.5)',
  },
  scanLine: {
    height: 1.5,
    backgroundColor: '#3B82F6',
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  detectionBox: { 
    position: 'absolute', 
    borderWidth: 1.5, 
    borderRadius: 8, 
    padding: 4,
  },
  detectionLabel: {
    position: 'absolute',
    top: -14,
    left: 0,
    backgroundColor: '#000',
    color: '#fff',
    fontSize: 8,
    paddingHorizontal: 4,
    borderRadius: 2,
    fontWeight: '900',
  },
  neuralFeed: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingBottom: 24, 
    gap: 20,
  },
  logContainer: { 
    flex: 1, 
    height: 100, 
    justifyContent: 'flex-end',
  },
  logLine: {
    fontSize: 8.5,
    color: '#3B82F6',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  captureWrap: { 
    alignItems: 'center', 
    gap: 6,
  },
  captureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  instruction: { 
    color: '#fff', 
    fontSize: 9.5, 
    fontWeight: '900', 
    letterSpacing: 0.5,
  },
  permissionBtn: { 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginTop: 20,
  },
});
