import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Switch,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getContacts, createContact, updateContact, Contact } from '../lib/api';
import { ContactsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactDetail'>;

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const contactId = route.params?.contactId;
  const isEditing = Boolean(contactId);

  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priorityOrder, setPriorityOrder] = useState('1');
  const [notifyViaSms, setNotifyViaSms] = useState(true);
  const [notifyViaCall, setNotifyViaCall] = useState(false);
  const [notifyViaEmail, setNotifyViaEmail] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing || !user) return;
    getContacts(user.id)
      .then((list) => {
        const c = list.find((x) => x.id === contactId);
        if (!c) return;
        setFullName(c.fullName);
        setRelationship(c.relationship ?? '');
        setPhone(c.phone ?? '');
        setEmail(c.email ?? '');
        setPriorityOrder(String(c.priorityOrder));
        setNotifyViaSms(c.notifyViaSms);
        setNotifyViaCall(c.notifyViaCall);
        setNotifyViaEmail(c.notifyViaEmail);
        setIsActive(c.isActive);
      })
      .catch(() => setError('Could not load contact.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError('');
    const priority = parseInt(priorityOrder, 10);
    if (!fullName.trim()) return setError('Full name is required.');
    if (!phone.trim() && !email.trim()) return setError('At least a phone number or email is required.');
    if (isNaN(priority) || priority < 1) return setError('Priority must be 1 or higher.');

    setSaving(true);
    try {
      const data = {
        fullName: fullName.trim(),
        relationship: relationship.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        priorityOrder: priority,
        notifyViaSms,
        notifyViaCall,
        notifyViaEmail,
      };

      if (isEditing) {
        await updateContact(user!.id, contactId!, { ...data, isActive });
      } else {
        await createContact(user!.id, data as Omit<Contact, 'id' | 'isActive'>);
      }
      navigation.goBack();
    } catch (err: any) {
      setError(err?.error ?? 'Could not save contact.');
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Full name *</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="e.g. Jane Smith" editable={!saving} />

        <Text style={styles.label}>Relationship</Text>
        <TextInput style={styles.input} value={relationship} onChangeText={setRelationship} placeholder="e.g. Daughter, Friend" editable={!saving} />

        <Text style={styles.label}>Phone number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" editable={!saving} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="jane@example.com" autoCapitalize="none" keyboardType="email-address" editable={!saving} />

        <Text style={styles.label}>Escalation priority</Text>
        <TextInput
          style={[styles.input, styles.inputNarrow]}
          value={priorityOrder}
          onChangeText={setPriorityOrder}
          keyboardType="number-pad"
          placeholder="1"
          editable={!saving}
        />
        <Text style={styles.hint}>1 = first person contacted when you miss a check-in</Text>

        <Text style={styles.sectionTitle}>Notify via</Text>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>SMS</Text>
          <Switch value={notifyViaSms} onValueChange={setNotifyViaSms} disabled={saving} trackColor={{ true: '#1a73e8' }} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>Phone call</Text>
          <Switch value={notifyViaCall} onValueChange={setNotifyViaCall} disabled={saving} trackColor={{ true: '#1a73e8' }} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>Email</Text>
          <Switch value={notifyViaEmail} onValueChange={setNotifyViaEmail} disabled={saving} trackColor={{ true: '#1a73e8' }} />
        </View>

        {isEditing && (
          <>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.toggle}>
              <Text style={styles.toggleLabel}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} disabled={saving} trackColor={{ true: '#34a853' }} />
            </View>
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{isEditing ? 'Save Changes' : 'Add Contact'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24, paddingBottom: 40 },
  error: { backgroundColor: '#fdecea', color: '#c62828', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 13, fontSize: 16, marginBottom: 12 },
  inputNarrow: { width: 100 },
  hint: { fontSize: 12, color: '#888', marginTop: -8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 20, marginBottom: 12 },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  toggleLabel: { fontSize: 16, color: '#1a1a1a' },
  button: { backgroundColor: '#1a73e8', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
