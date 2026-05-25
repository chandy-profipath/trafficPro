import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme';

export default function SafetyHub() {
  const { colors, mode } = useTheme();
  const [radarActive, setRadarActive] = useState(true);
  const [sosActive, setSosActive] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Safety Score Card */}
      <View style={[styles.scoreCard, { backgroundColor: colors.primary }]}>
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreLabel}>DRIVING SAFETY SCORE</Text>
            <Text style={styles.scoreValue}>98.4</Text>
            <View style={styles.tierBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#fff" />
              <Text style={styles.tierText}>ELITE DRIVER</Text>
            </View>
          </View>
          <View style={styles.progressCircle}>
             <Text style={styles.pText}>+2.4</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
             <Text style={styles.statVal}>12</Text>
             <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.stat}>
             <Text style={styles.statVal}>48</Text>
             <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.stat}>
             <Text style={styles.statVal}>850</Text>
             <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </View>

      {/* Proactive Safety Tools */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Strategic Tools</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.toolCard, { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: radarActive ? colors.danger : colors.border }]}
            onPress={() => {
              const nextState = !radarActive;
              setRadarActive(nextState);
              Alert.alert(
                'Blackspot Radar',
                nextState 
                  ? 'Blackspot Radar active! Scanning route path for critical high-risk crime or accident zones.'
                  : 'Blackspot Radar deactivated. High-risk security warnings are temporarily paused.'
              );
            }}
          >
             <View style={[styles.toolIcon, { backgroundColor: radarActive ? colors.danger + '20' : colors.border + '20' }]}>
                <MaterialCommunityIcons name="radar" size={24} color={radarActive ? colors.danger : colors.textMuted} />
             </View>
             <Text style={[styles.toolTitle, { color: colors.text }]}>Blackspot Radar</Text>
             <Text style={[styles.toolSub, { color: colors.textMuted }]}>Security & Accident data</Text>
             <View style={[styles.activeBadge, { backgroundColor: radarActive ? colors.danger : colors.textMuted }]}>
                <Text style={styles.activeText}>{radarActive ? 'ACTIVE' : 'MUTED'}</Text>
             </View>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.toolCard, { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: sosActive ? colors.success : colors.primary }]}
            onPress={() => {
              if (sosActive) {
                Alert.alert(
                  'SOS Active',
                  'Emergency service request is already dispatched. Our nearest recovery vehicle is on the way.'
                );
                return;
              }
              Alert.alert(
                'SOS Emergency Dispatch',
                'Instantly request recovery vehicle & professional breakdown support to your current GPS position?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Dispatch Now', 
                    style: 'destructive',
                    onPress: () => {
                      setSosActive(true);
                      Alert.alert(
                        'Dispatch Initialized',
                        'SOS Dispatch Active! An emergency recovery team has been assigned and is heading to your coordinates. Stand by!'
                      );
                    }
                  }
                ]
              );
            }}
          >
             <View style={[styles.toolIcon, { backgroundColor: sosActive ? colors.success + '20' : colors.primary + '20' }]}>
                <MaterialCommunityIcons name="toolbox" size={24} color={sosActive ? colors.success : colors.primary} />
             </View>
             <Text style={[styles.toolTitle, { color: colors.text }]}>SOS Mechanic</Text>
             <Text style={[styles.toolSub, { color: colors.textMuted }]}>On-demand Fundi</Text>
             <TouchableOpacity 
               style={[styles.requestBtn, { backgroundColor: sosActive ? colors.success : colors.primary }]}
               onPress={() => {
                 if (sosActive) {
                   Alert.alert('SOS Active', 'Recovery dispatch requested successfully!');
                 } else {
                   setSosActive(true);
                   Alert.alert('SOS Active', 'Breakdown mechanic is currently en route to your coordinates.');
                 }
               }}
             >
                <Text style={styles.requestText}>{sosActive ? 'EN ROUTE' : 'REQUEST'}</Text>
             </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rewards Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Rewards</Text>
        <TouchableOpacity style={[styles.rewardItem, { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: colors.border }]}>
          <View style={[styles.rewardIcon, { backgroundColor: '#F59E0B20' }]}>
            <FontAwesome5 name="oil-can" size={20} color="#F59E0B" />
          </View>
          <View style={styles.rewardContent}>
            <Text style={[styles.rewardTitle, { color: colors.text }]}>15% Off Oil Change</Text>
            <Text style={[styles.rewardSub, { color: colors.textMuted }]}>Redeem at QuickFix Auto Care</Text>
            <View style={[styles.progressBar, { backgroundColor: mode === 'dark' ? '#1E293B' : '#F1F5F9' }]}>
              <View style={[styles.progressFill, { width: '85%', backgroundColor: '#F59E0B' }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>850 / 1000 SP</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Verification History */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <View style={styles.historyRow}>
          <View style={[styles.historyDot, { backgroundColor: colors.success }]} />
          <View style={styles.historyText}>
            <Text style={[styles.historyAction, { color: colors.text }]}>Verified: Pothole at Main St</Text>
            <Text style={[styles.historyTime, { color: colors.textMuted }]}>Today, 2:45 PM • +10 SP</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  scoreCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  scoreLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  scoreValue: { color: '#fff', fontSize: 44, fontWeight: '900', marginVertical: 4 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 6 },
  tierText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  progressCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  pText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  stat: { alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  vDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
  toolsGrid: { flexDirection: 'row', gap: 16 },
  toolCard: { flex: 1, borderRadius: 24, padding: 16, borderWidth: 1.5 },
  toolIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  toolTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  toolSub: { fontSize: 10, fontWeight: '600', lineHeight: 14, marginBottom: 12 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  activeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  requestBtn: { paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  requestText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  rewardItem: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12, gap: 16 },
  rewardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardContent: { flex: 1 },
  rewardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  rewardSub: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4, marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 9, fontWeight: '800', textAlign: 'right' },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyText: { flex: 1 },
  historyAction: { fontSize: 14, fontWeight: '600' },
  historyTime: { fontSize: 11, fontWeight: '500', marginTop: 2 },
});


