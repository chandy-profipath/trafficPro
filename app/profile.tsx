import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated, Platform, UIManager, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme';
import { supabase } from '../lib/supabase';
import { BlurView } from 'expo-blur';

// Modern LayoutAnimation is active by default

export default function ProfilePage() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const userX = params.x ? Number(params.x) : 50;
  const userY = params.y ? Number(params.y) : 50;
  const fade = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'email' | 'password' | 'confirm' | null>(null);

  useEffect(() => {
    Animated.spring(fade, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(data.user || null);
      } catch (e) {
        console.warn('auth.getUser failed', e);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSignUp() {
    if (!email || !email.includes('@')) return Alert.alert('Enter a valid email');
    if (!username || username.length < 2) return Alert.alert('Choose a username');
    if (!password || password.length < 6) return Alert.alert('Password must be at least 6 characters');
    if (password !== confirmPassword) return Alert.alert('Passwords do not match');
    setSending(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password }, { data: { username } });
      if (error) throw error;
      // try to set user state if available
      const u = await supabase.auth.getUser();
      setUser(u.data.user || null);
      Alert.alert('Signed up', data.user ? 'Account created' : 'Account created — check email if confirmation required');
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Sign-up failed', e.message || String(e));
    } finally { setSending(false); }
  }

  async function handleSignIn() {
    if (!email || !email.includes('@')) return Alert.alert('Enter a valid email');
    if (!password) return Alert.alert('Enter your password');
    setSending(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = await supabase.auth.getUser();
      setUser(u.data.user || null);
      Alert.alert('Signed in');
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Sign-in failed', e.message || String(e));
    } finally { setSending(false); }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (e) {
      console.warn('Sign-out failed', e);
    }
  }

  async function requestPasswordReset() {
    if (!email || !email.includes('@')) return Alert.alert('Enter your email to reset password');
    try {
      // supabase v2 API may support auth.resetPasswordForEmail
      // attempt to call available method, otherwise instruct user
      if ((supabase.auth as any).resetPasswordForEmail) {
        const { error } = await (supabase.auth as any).resetPasswordForEmail(email);
        if (error) throw error;
        Alert.alert('Check your email', 'Password reset instructions have been sent.');
      } else {
        Alert.alert('Reset password', 'Please use the Supabase dashboard or contact support to reset your password.');
      }
    } catch (e: any) {
      console.warn('reset failed', e);
      Alert.alert('Reset failed', e?.message || String(e));
    }
  }

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  async function saveProfile() {
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { username: newUsername } });
      if (error) throw error;
      const u = await supabase.auth.getUser();
      setUser(u.data.user || null);
      setEditingUsername(false);
      Alert.alert('Saved', 'Profile updated');
    } catch (e: any) {
      console.warn('update profile failed', e);
      Alert.alert('Update failed', e?.message || String(e));
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (!user) {
    const isDark = colors.bg === '#020617';
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={[
              styles.back, 
              { 
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: 1,
              }
            ]} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <Animated.ScrollView contentContainerStyle={styles.container} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }}>
            <View
              style={[
                styles.card,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                  shadowColor: isDark ? '#000000' : colors.text,
                }
              ]}
            > 
              {/* Brand Logo Badge */}
              <View style={styles.logoContainer}>
                <View style={[styles.logoOuterCircle, { borderColor: colors.primary, shadowColor: colors.primary }]}>
                  <View style={[styles.logoInnerCircle, { backgroundColor: colors.primary + '18' }]}>
                    <MaterialCommunityIcons name="shield-car" size={34} color={colors.primary} />
                  </View>
                </View>
                <Text style={[styles.logoText, { color: colors.text }]}>Traffic<Text style={{ color: colors.primary }}>Pro</Text></Text>
                <Text style={[styles.logoSubtext, { color: colors.textMuted }]}>SENTINEL ACTIVE PROTECTION</Text>
              </View>

              {/* Dynamic Header */}
              <View style={styles.heroTextContainer}>
                <Text style={[styles.heading, { color: colors.text }]}>
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {isSignUp ? 'Join TrafficPro to monitor and protect your routes.' : 'Sign in to access premium real-time safety services.'}
                </Text>
              </View>

              {/* Username field (Sign Up Only) */}
              {isSignUp && (
                <View style={[
                  styles.field,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(241, 245, 249, 0.65)',
                    borderColor: focusedField === 'username' ? colors.primary : colors.border,
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="account" 
                    size={20} 
                    color={focusedField === 'username' ? colors.primary : colors.textMuted} 
                    style={styles.fieldIcon} 
                  />
                  <TextInput 
                    placeholder="Username" 
                    placeholderTextColor={colors.textMuted} 
                    value={username} 
                    onChangeText={setUsername} 
                    style={[styles.inputWithIcon, { color: colors.text }]} 
                    autoCapitalize="none" 
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              {/* Email field */}
              <View style={[
                styles.field,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(241, 245, 249, 0.65)',
                  borderColor: focusedField === 'email' ? colors.primary : colors.border,
                }
              ]}>
                <MaterialCommunityIcons 
                  name="email" 
                  size={20} 
                  color={focusedField === 'email' ? colors.primary : colors.textMuted} 
                  style={styles.fieldIcon} 
                />
                <TextInput 
                  placeholder="your@email.com" 
                  placeholderTextColor={colors.textMuted} 
                  value={email} 
                  onChangeText={setEmail} 
                  style={[styles.inputWithIcon, { color: colors.text }]} 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password field */}
              <View style={[
                styles.field,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(241, 245, 249, 0.65)',
                  borderColor: focusedField === 'password' ? colors.primary : colors.border,
                }
              ]}>
                <Ionicons 
                  name="lock-closed" 
                  size={20} 
                  color={focusedField === 'password' ? colors.primary : colors.textMuted} 
                  style={styles.fieldIcon} 
                />
                <TextInput 
                  placeholder="Password" 
                  placeholderTextColor={colors.textMuted} 
                  value={password} 
                  onChangeText={setPassword} 
                  style={[styles.inputWithIcon, { color: colors.text }]} 
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.fieldEye}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Confirm Password field or Forgot Password link */}
              {isSignUp ? (
                <View style={[
                  styles.field,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.35)' : 'rgba(241, 245, 249, 0.65)',
                    borderColor: focusedField === 'confirm' ? colors.primary : colors.border,
                  }
                ]}>
                  <Ionicons 
                    name="lock-closed" 
                    size={20} 
                    color={focusedField === 'confirm' ? colors.primary : colors.textMuted} 
                    style={styles.fieldIcon} 
                  />
                  <TextInput 
                    placeholder="Confirm password" 
                    placeholderTextColor={colors.textMuted} 
                    value={confirmPassword} 
                    onChangeText={setConfirmPassword} 
                    style={[styles.inputWithIcon, { color: colors.text }]} 
                    secureTextEntry={!showConfirm}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.fieldEye}>
                    <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={requestPasswordReset} style={styles.forgotBtn} activeOpacity={0.7}>
                  <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {/* Action Button */}
              <TouchableOpacity 
                style={[
                  styles.btn, 
                  { 
                    backgroundColor: colors.primary, 
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 6,
                  }
                ]} 
                onPress={() => { isSignUp ? handleSignUp() : handleSignIn(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>{sending ? 'Working...' : (isSignUp ? 'Create Account' : 'Sign In')}</Text>
              </TouchableOpacity>

              {/* Toggler */}
              <TouchableOpacity 
                style={styles.switchLink} 
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsSignUp((s) => !s);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.switchLinkText, { color: colors.primary }]}>
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
              </TouchableOpacity>

              {/* Note */}
              <View style={styles.noteContainer}>
                <MaterialCommunityIcons name="information-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.note, { color: colors.textMuted }]}>
                  After signing in, you will unlock active telemetry monitoring, road hazard reports, and premium mechanic access.
                </Text>
              </View>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }] }>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity onPress={handleSignOut} style={{ padding: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[styles.profileCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="account-circle" size={44} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sub, { color: colors.textMuted }]}>Signed in as</Text>
              <Text style={[styles.emailText, { color: colors.text }]}>{user.email}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>Username: {user?.user_metadata?.username || '—'}</Text>
            </View>
          </View>

          <View style={{ height: 14 }} />
          <Text style={[styles.section, { color: colors.text }]}>Profile settings</Text>
          {editingUsername ? (
            <View>
              <TextInput placeholder="Username" placeholderTextColor={colors.textMuted} value={newUsername} onChangeText={setNewUsername} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={saveProfile}><Text style={{ color: '#fff', fontWeight: '800' }}>Save</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#9CA3AF', flex: 1 }]} onPress={() => { setEditingUsername(false); setNewUsername(''); }}><Text style={{ color: '#fff', fontWeight: '800' }}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => { setEditingUsername(true); setNewUsername(user?.user_metadata?.username || ''); }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Edit username</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 18 }} />
        <Text style={[styles.section, { color: colors.text }]}>Manage Shops</Text>
        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, marginTop: 8, flexDirection: 'row', justifyContent: 'center' }]} 
          onPress={() => router.push({ pathname: '/manage-shops', params: { x: userX, y: userY } })}
        >
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Manage Shops</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ position: 'absolute', right: 16 }} />
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  back: { 
    width: 40,
    height: 40,
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoOuterCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoInnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 2,
  },
  heroTextContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: { 
    fontSize: 24, 
    fontWeight: '900', 
    lineHeight: 30, 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 13, 
    marginTop: 6, 
    lineHeight: 18, 
    textAlign: 'center', 
    maxWidth: 280 
  },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12 },
  field: { 
    marginTop: 14,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 52,
    paddingHorizontal: 14,
  },
  fieldIcon: { 
    marginRight: 10,
  },
  inputWithIcon: { 
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  fieldEye: { 
    padding: 8,
    marginLeft: 6,
  },
  btn: { 
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotText: {
    fontWeight: '700',
    fontSize: 13,
  },
  switchLink: {
    marginTop: 18,
    alignSelf: 'center',
    paddingVertical: 6,
  },
  switchLinkText: {
    fontWeight: '700',
    fontSize: 14,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 4,
  },
  note: { 
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    flex: 1,
  },
  section: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  profileCard: { padding: 16, borderRadius: 12, borderWidth: 1, shadowOpacity: 0.08, shadowRadius: 10, elevation: 6 },
  emailText: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  card: { 
    padding: 24, 
    borderRadius: 24, 
    borderWidth: 1.5, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 3,
  },
});
