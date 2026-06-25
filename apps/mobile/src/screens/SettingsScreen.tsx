import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getUser, updateProfile, changePassword, UserProfile } from '../lib/api';
import { SettingsStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsRoot'>;

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const TZ_LABELS: Record<string, string> = {
  'UTC': 'UTC',
  'America/New_York': 'Eastern',
  'America/Chicago': 'Central',
  'America/Denver': 'Mountain',
  'America/Los_Angeles': 'Pacific',
  'Europe/London': 'London',
  'Europe/Paris': 'Paris',
  'Asia/Tokyo': 'Tokyo',
  'Asia/Shanghai': 'Shanghai',
  'Australia/Sydney': 'Sydney',
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getUser(user.id);
      setProfile(p);
      setDisplayName(p.displayName ?? '');
      setPhone(p.phone ?? '');
      setTimezone(p.timezone ?? 'UTC');
      setProfileError('');
    } catch {
      setProfileError('Could not load profile.');
    }
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    setProfileError('');
    try {
      const updated = await updateProfile(user.id, { displayName, phone, timezone });
      setProfile(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: any) {
      setProfileError(err?.error ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (!user) return;
    setChangingPassword(true);
    try {
      await changePassword(user.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (err: any) {
      setPasswordError(err?.error ?? 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Account header */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{profile?.fullName ?? user?.fullName}</Text>
        <Text style={styles.headerEmail}>{profile?.email ?? user?.email}</Text>
      </View>

      {profileError ? <Text style={styles.error}>{profileError}</Text> : null}

      {/* Profile section */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Display name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Optional nickname"
          placeholderTextColor="#aaa"
          editable={!saving}
        />
        <Text style={styles.fieldLabel}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 000 0000"
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
          editable={!saving}
        />
        <Text style={styles.fieldLabel}>Timezone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tzRow}>
          {TIMEZONES.map((tz) => (
            <TouchableOpacity
              key={tz}
              style={[styles.chip, tz === timezone && styles.chipActive]}
              onPress={() => setTimezone(tz)}
              disabled={saving}
            >
              <Text style={[styles.chipText, tz === timezone && styles.chipTextActive]}>
                {TZ_LABELS[tz]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save Profile</Text>}
        </TouchableOpacity>
      </View>

      {/* Check-in schedule link */}
      <Text style={styles.sectionTitle}>App Settings</Text>
      <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('Schedule')}>
        <View>
          <Text style={styles.navRowLabel}>Check-in Schedule</Text>
          <Text style={styles.navRowSub}>Daily prompt time, response window, escalation</Text>
        </View>
        <Text style={styles.navRowArrow}>›</Text>
      </TouchableOpacity>

      {/* Change password */}
      <Text style={styles.sectionTitle}>Account</Text>
      <TouchableOpacity
        style={styles.navRow}
        onPress={() => { setShowPasswordForm((v) => !v); setPasswordError(''); }}
      >
        <Text style={styles.navRowLabel}>Change Password</Text>
        <Text style={styles.navRowArrow}>{showPasswordForm ? '↑' : '›'}</Text>
      </TouchableOpacity>

      {showPasswordForm && (
        <View style={styles.card}>
          {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
          <Text style={styles.fieldLabel}>Current password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Current password"
            placeholderTextColor="#aaa"
            editable={!changingPassword}
          />
          <Text style={styles.fieldLabel}>New password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Min 8 chars, uppercase, number, symbol"
            placeholderTextColor="#aaa"
            editable={!changingPassword}
          />
          <Text style={styles.fieldLabel}>Confirm new password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repeat new password"
            placeholderTextColor="#aaa"
            editable={!changingPassword}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword} disabled={changingPassword}>
            {changingPassword
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveButtonText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 48, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: '#1a73e8', borderRadius: 12, padding: 20,
    marginBottom: 24, alignItems: 'center',
  },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12,
    fontSize: 15, color: '#1a1a1a', backgroundColor: '#fafafa',
  },
  tzRow: { gap: 8, paddingBottom: 4, paddingTop: 4 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipText: { fontSize: 13, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveButton: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  navRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  navRowLabel: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  navRowSub: { fontSize: 12, color: '#888', marginTop: 2 },
  navRowArrow: { fontSize: 22, color: '#aaa', marginLeft: 8 },
  error: { backgroundColor: '#fdecea', color: '#c62828', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 },
  signOutButton: {
    marginTop: 24, borderRadius: 10, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#d93025',
  },
  signOutText: { color: '#d93025', fontSize: 16, fontWeight: '700' },
});
