import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

interface Props {
  onClose: () => void;
}

export default function RoadCapture({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(true);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [logs, setLogs] = useState<string[]>(['[SENTINEL] Neural engine engaged', '[SENTINEL] LIDAR/Optical Fusion Active']);
  const [incident, setIncident] = useState(false);

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

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        <View style={[styles.overlay, { paddingTop: insets.top + 20 }]}>
          {/* Top HUD */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={[styles.statusColumn, { alignItems: 'center' }]}>
               <View style={[styles.badge, incident && { backgroundColor: '#EF4444' }]}>
                 <MaterialCommunityIcons name={incident ? 'alert' : 'shield-airplane'} size={14} color="#fff" />
                 <Text style={styles.badgeText}>{incident ? 'INCIDENT DETECTED' : 'SENTINEL ACTIVE'}</Text>
               </View>
               <Text style={styles.telemetryText}>0.98 G · 15.2° PITCH</Text>
            </View>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>AUTO</Text>
            </View>
          </View>

          {/* Neural Target Area */}
          <View style={styles.scanTarget}>
            {/* Corner Angles */}
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
                      outputRange: [0, 300]
                    })
                  }]
                }
              ]} 
            />
            
            {/* AI Detections */}
            <View style={[styles.detectionBox, { top: 60, left: 20, width: 90, height: 70, borderColor: '#3B82F6' }]}>
               <Text style={styles.detectionLabel}>ASPHALT MAPPING</Text>
            </View>
            <View style={[styles.detectionBox, { top: 140, right: 30, width: 100, height: 110, borderColor: '#F59E0B' }]}>
               <Text style={styles.detectionLabel}>LIVESTOCK DETECTED</Text>
            </View>
          </View>

          {/* Neural Log */}
          <View style={styles.neuralFeed}>
             <View style={styles.logContainer}>
                {logs.map((log, i) => (
                   <Text key={i} style={[styles.logLine, { opacity: 1 - (i * 0.12) }]}>{log}</Text>
                ))}
             </View>
             
             {/* Circular Capture */}
             <View style={styles.captureWrap}>
                <TouchableOpacity style={styles.captureBtn} onPress={onClose}>
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
  container: { flex: 1, justifyContent: 'center' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  statusColumn: { flex: 1, gap: 4 },
  telemetryText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  scanTarget: {
    alignSelf: 'center',
    width: Dimensions.get('window').width * 0.8,
    height: 300,
    position: 'relative',
  },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: 'rgba(255,255,255,0.4)' },
  scanLine: {
    height: 1,
    backgroundColor: '#3B82F6',
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  detectionBox: { position: 'absolute', borderWidth: 1.5, borderRadius: 12, padding: 4 },
  detectionLabel: {
    position: 'absolute',
    top: -18,
    left: 0,
    backgroundColor: '#000',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontWeight: '900',
  },
  neuralFeed: { flexDirection: 'row', alignItems: 'center', paddingBottom: 40, gap: 20 },
  logContainer: { flex: 1, height: 140, justifyContent: 'flex-end' },
  logLine: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 3,
  },
  captureWrap: { alignItems: 'center', gap: 12 },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  instruction: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  permissionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
});
