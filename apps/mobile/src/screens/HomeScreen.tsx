import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getTodayEvent, completeCheckin, logout } from '../lib/api';

interface CheckinEvent {
  id: string;
  status: string;
  scheduledAt: string;
  respondedAt: string | null;
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [event, setEvent] = useState<CheckinEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadEvent = useCallback(async () => {
    if (!user) return;
    try {
      const e = await getTodayEvent(user.id);
      setEvent(e);
      setError('');
    } catch {
      setError('Could not load check-in status.');
    }
  }, [user]);

  useEffect(() => {
    loadEvent().finally(() => setLoadingEvent(false));
  }, [loadEvent]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadEvent();
    setRefreshing(false);
  }

  async function handleCheckin() {
    if (!user || !event) return;
    setCheckingIn(true);
    setError('');
    try {
      await completeCheckin(user.id, event.id);
      setEvent((e) => e ? { ...e, status: 'completed', respondedAt: new Date().toISOString() } : e);
    } catch {
      setError('Check-in failed. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleLogout() {
    if (user) await logout(user.id).catch(() => {});
    await signOut();
  }

  const greeting = user?.fullName?.split(' ')[0] ?? 'there';
  const hasEvent = event !== null;
  const isPending = event?.status === 'pending';
  const isCompleted = event?.status === 'completed' || event?.status === 'late';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>DoingOK</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutLink}>Log out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.greeting}>Hi, {greeting}!</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loadingEvent ? (
        <ActivityIndicator size="large" color="#1a73e8" style={styles.spinner} />
      ) : !hasEvent ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No check-in scheduled today</Text>
          <Text style={styles.cardBody}>
            Set up your check-in schedule in Settings to get started.
          </Text>
        </View>
      ) : isCompleted ? (
        <View style={[styles.card, styles.successCard]}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.cardTitle}>You're checked in!</Text>
          <Text style={styles.cardBody}>
            Checked in at {new Date(event!.respondedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          </Text>
        </View>
      ) : isPending ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Time for your daily check-in</Text>
          <Text style={styles.cardBody}>
            Scheduled for {new Date(event!.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          </Text>
          <TouchableOpacity
            style={styles.checkinButton}
            onPress={handleCheckin}
            disabled={checkingIn}
            accessibilityLabel="I'm OK — complete check-in"
          >
            {checkingIn
              ? <ActivityIndicator color="#fff" size="large" />
              : <Text style={styles.checkinButtonText}>I'm OK</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Check-in status: {event?.status}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f7fa', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 22, fontWeight: '700', color: '#1a73e8' },
  logoutLink: { fontSize: 14, color: '#888' },
  greeting: { fontSize: 26, fontWeight: '600', marginBottom: 20, color: '#1a1a1a' },
  error: { backgroundColor: '#fdecea', color: '#c62828', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  spinner: { marginTop: 60 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  successCard: { borderLeftWidth: 4, borderLeftColor: '#34a853' },
  successIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' },
  cardBody: { fontSize: 15, color: '#555', lineHeight: 22 },
  checkinButton: {
    backgroundColor: '#34a853',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 64,
    justifyContent: 'center',
  },
  checkinButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
