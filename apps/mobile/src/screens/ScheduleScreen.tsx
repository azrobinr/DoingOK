import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getSchedule, createSchedule, updateSchedule, Schedule } from '../lib/api';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WINDOW_OPTIONS = [30, 60, 90, 120, 180, 240, 300, 360, 420, 480];
const DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
}

function Picker({
  label, value, options, format, onChange, disabled,
}: {
  label: string;
  value: number;
  options: number[];
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <View style={pickerStyles.container}>
      <Text style={pickerStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pickerStyles.scroll}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[pickerStyles.chip, opt === value && pickerStyles.chipActive]}
            onPress={() => onChange(opt)}
            disabled={disabled}
          >
            <Text style={[pickerStyles.chipText, opt === value && pickerStyles.chipTextActive]}>
              {format(opt)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 10 },
  scroll: { gap: 8, paddingBottom: 4 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipText: { fontSize: 14, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Local edit state
  const [hour, setHour] = useState(9);
  const [window, setWindow] = useState(120);
  const [delay, setDelay] = useState(15);
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const s = await getSchedule(user.id);
      setSchedule(s);
      if (s) {
        setHour(s.scheduledHour);
        setWindow(s.windowMinutes);
        setDelay(s.escalationDelayMinutes);
        setActive(s.isActive);
      }
      setError('');
    } catch {
      setError('Could not load schedule.');
    }
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const data = { frequency: 'daily', scheduledHour: hour, windowMinutes: window, escalationDelayMinutes: delay, isActive: active };
      if (schedule) {
        const updated = await updateSchedule(user.id, data);
        setSchedule(updated);
      } else {
        const created = await createSchedule(user.id, data);
        setSchedule(created);
      }
      Alert.alert('Saved', 'Your check-in schedule has been updated.');
    } catch (err: any) {
      setError(err?.error ?? 'Could not save schedule.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Check-in Schedule</Text>
      <Text style={styles.subtitle}>
        You'll receive a daily prompt at the time below. If you don't respond within your window, your trusted contacts will be notified.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.activeRow}>
        <View>
          <Text style={styles.activeLabel}>Check-ins enabled</Text>
          <Text style={styles.activeSub}>Turn off to pause all check-in prompts</Text>
        </View>
        <Switch value={active} onValueChange={setActive} disabled={saving} trackColor={{ true: '#34a853' }} />
      </View>

      <View style={styles.card}>
        <Picker
          label="Check-in time"
          value={hour}
          options={HOURS}
          format={formatHour}
          onChange={setHour}
          disabled={saving}
        />
        <Picker
          label="Response window"
          value={window}
          options={WINDOW_OPTIONS}
          format={formatMinutes}
          onChange={setWindow}
          disabled={saving}
        />
        <Picker
          label="Time between escalation steps"
          value={delay}
          options={DELAY_OPTIONS}
          format={formatMinutes}
          onChange={setDelay}
          disabled={saving}
        />
      </View>

      <Text style={styles.explanation}>
        If you miss your check-in, your first contact will be notified immediately, then the next contact after {formatMinutes(delay)} if there's still no response.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Save Schedule</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f5f7fa' },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  error: { backgroundColor: '#fdecea', color: '#c62828', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  activeLabel: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  activeSub: { fontSize: 12, color: '#888', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  explanation: { fontSize: 13, color: '#666', lineHeight: 19, marginBottom: 24, paddingHorizontal: 4 },
  button: { backgroundColor: '#1a73e8', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
