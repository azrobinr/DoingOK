import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getContacts, deleteContact, Contact } from '../lib/api';
import { ContactsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ContactsStackParamList, 'ContactsList'>;

export default function ContactsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const list = await getContacts(user.id);
      setContacts(list);
      setError('');
    } catch {
      setError('Could not load contacts.');
    }
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Reload when returning from ContactDetail
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  async function handleDelete(contact: Contact) {
    Alert.alert(
      'Remove contact',
      `Remove ${contact.fullName} from your trusted contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(user!.id, contact.id);
              setContacts((prev) => prev.filter((c) => c.id !== contact.id));
            } catch (err: any) {
              Alert.alert('Error', err?.error ?? 'Could not remove contact.');
            }
          },
        },
      ]
    );
  }

  function notifyMethods(c: Contact): string {
    const methods = [];
    if (c.notifyViaSms) methods.push('SMS');
    if (c.notifyViaCall) methods.push('Call');
    if (c.notifyViaEmail) methods.push('Email');
    return methods.join(' · ') || 'None';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No trusted contacts yet</Text>
            <Text style={styles.emptyBody}>
              Add people who should be notified if you miss a check-in.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isActive && styles.cardInactive]}>
            <View style={styles.cardLeft}>
              <Text style={styles.step}>{item.priorityOrder}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.fullName}</Text>
              {item.relationship ? <Text style={styles.meta}>{item.relationship}</Text> : null}
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
              <Text style={styles.notify}>{notifyMethods(item)}</Text>
              {!item.isActive && <Text style={styles.inactive}>Inactive</Text>}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
                style={styles.actionBtn}
              >
                <Text style={styles.actionEdit}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Text style={styles.actionDelete}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={contacts.length === 0 ? styles.listEmpty : styles.list}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('ContactDetail', {})}
      >
        <Text style={styles.addButtonText}>+ Add Contact</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { backgroundColor: '#fdecea', color: '#c62828', padding: 12, margin: 16, borderRadius: 8, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  listEmpty: { flexGrow: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardInactive: { opacity: 0.5 },
  cardLeft: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a73e8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  step: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  meta: { fontSize: 13, color: '#666', marginBottom: 1 },
  notify: { fontSize: 12, color: '#888', marginTop: 4 },
  inactive: { fontSize: 12, color: '#e53935', marginTop: 2, fontWeight: '600' },
  cardActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  actionBtn: { padding: 4 },
  actionEdit: { color: '#1a73e8', fontSize: 13, fontWeight: '600' },
  actionDelete: { color: '#e53935', fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  addButton: { position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
